import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import type { RequestUser } from '../common/types/request-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const COOKIE_NAME = 'inv360_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService,
    private readonly tenantMembershipsService: TenantMembershipsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return { ok: true };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Post('switch-tenant')
  async switchTenant(
    @Body() body: { tenantId: string },
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.switchTenant(user.id, body.tenantId);
    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const [tenant, memberships] = await Promise.all([
      user.activeTenantId ? this.tenantsService.findById(user.activeTenantId) : null,
      this.tenantMembershipsService.findByUserId(user.id),
    ]);

    const userRecord = await this.authService.getUser(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.globalRole,
      tenantRole: user.tenantRole,
      avatarUrl: userRecord?.avatarUrl ?? null,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone ?? null,
            isOnboarded: tenant.isOnboarded,
          }
        : null,
      tenants: memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenant?.name ?? '',
        role: m.role,
      })),
    };
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  @Public()
  @Get('google')
  googleStart(@Res() res: Response) {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: `${this.config.getOrThrow<string>('API_URL')}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const errorRedirect = (msg: string) => res.redirect(`${frontendUrl}/login?error=${msg}`);

    try {
      // Exchange authorization code for access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
          redirect_uri: `${this.config.getOrThrow<string>('API_URL')}/auth/google/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const { access_token } = (await tokenRes.json()) as { access_token: string };
      if (!access_token) return errorRedirect('google_failed');

      // Get user profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { email, picture } = (await profileRes.json()) as { email: string; picture?: string };
      if (!email) return errorRedirect('google_failed');

      // Find user and build JWT
      const {
        access_token: jwtToken,
        memberships,
        activeTenantId,
        userId,
      } = await this.authService.loginByEmail(email);

      // Save Google avatar (best-effort)
      if (picture && userId) {
        void this.authService.saveAvatar(userId, picture);
      }

      const isProd = process.env.NODE_ENV === 'production';
      const clientCookieBase = {
        httpOnly: false as const,
        secure: isProd,
        sameSite: 'lax' as const,
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      };

      res.cookie(COOKIE_NAME, jwtToken, { ...clientCookieBase, httpOnly: true });
      res.cookie('inv360_role', 'user', clientCookieBase);

      if (memberships.length === 0) {
        return errorRedirect('no_tenant');
      }

      if (memberships.length > 1 || !activeTenantId) {
        res.cookie('inv360_onboarded', 'false', clientCookieBase);
        return res.redirect(`${frontendUrl}/select-tenant`);
      }

      const tenant = await this.tenantsService.findById(activeTenantId);
      res.cookie('inv360_onboarded', String(tenant?.isOnboarded ?? false), clientCookieBase);
      const destination = tenant?.isOnboarded
        ? `${frontendUrl}/dashboard`
        : `${frontendUrl}/onboarding`;
      return res.redirect(destination);
    } catch (err) {
      if (err instanceof Error && err.message.includes('cuenta')) {
        return errorRedirect('no_account');
      }
      return errorRedirect('google_failed');
    }
  }
}
