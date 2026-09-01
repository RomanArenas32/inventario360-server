import { Body, Controller, Get, Post, Query, Res, UnauthorizedException } from '@nestjs/common';
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
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { SignupDto } from './dto/signup.dto';

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
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, memberships } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    // access_token incluido para clientes mobile (no pueden leer cookies httpOnly)
    return { ok: true, access_token, memberships };
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
    // access_token incluido para clientes mobile
    return { ok: true, access_token };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const [tenant, memberships] = await Promise.all([
      user.activeTenantId ? this.tenantsService.findById(user.activeTenantId) : null,
      this.tenantMembershipsService.findByUserId(user.id),
    ]);

    const userRecord = await this.authService.getUser(user.id);

    // Prefer live DB role over stale JWT value
    const activeMembership = user.activeTenantId
      ? memberships.find((m) => m.tenantId === user.activeTenantId)
      : null;
    const tenantRole = activeMembership?.role ?? user.tenantRole;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.globalRole,
      tenantRole,
      avatarUrl: userRecord?.avatarUrl ?? null,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone ?? null,
            isOnboarded: tenant.isOnboarded,
            staffModules: tenant.staffModules,
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
      prompt: 'select_account',
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
      const { email, picture, name } = (await profileRes.json()) as {
        email: string;
        picture?: string;
        name?: string;
      };
      if (!email) return errorRedirect('google_failed');

      // Find or create user (open registration)
      const user = await this.authService.findOrCreateByGoogle({ email, name, picture });
      const memberships = await this.tenantMembershipsService.findByUserId(user.id);

      // Redirect to frontend API route which sets cookies in the correct domain
      const callbackBase = `${frontendUrl}/api/auth/google/callback`;
      const params = (token: string, destination: string, onboarded: boolean) =>
        `?token=${token}&role=${user.globalRole}&onboarded=${onboarded}&destination=${encodeURIComponent(destination)}`;

      if (memberships.length === 0) {
        const token = this.authService.signToken({
          sub: user.id,
          email: user.email,
          globalRole: user.globalRole,
          activeTenantId: null,
          tenantRole: null,
        });
        return res.redirect(`${callbackBase}${params(token, '/register', false)}`);
      }

      // Preferir un tenant onboarded; si ninguno lo está, usar el primero
      const tenants = await Promise.all(
        memberships.map((m) => this.tenantsService.findById(m.tenantId)),
      );
      const onboardedIdx = tenants.findIndex((t) => t?.isOnboarded);
      const idx = onboardedIdx >= 0 ? onboardedIdx : 0;
      const chosen = memberships[idx];
      const chosenTenant = tenants[idx];

      const finalToken = this.authService.signToken({
        sub: user.id,
        email: user.email,
        globalRole: user.globalRole,
        activeTenantId: chosen.tenantId,
        tenantRole: chosen.role,
      });

      const isOnboarded = chosenTenant?.isOnboarded ?? false;
      const destination = isOnboarded ? '/dashboard' : '/onboarding';
      return res.redirect(`${callbackBase}${params(finalToken, destination, isOnboarded)}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('cuenta')) {
        return errorRedirect('no_account');
      }
      return errorRedirect('google_failed');
    }
  }

  // ── Google OAuth — Mobile (expo-auth-session) ──────────────────────────────

  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  @Post('google/mobile')
  async googleMobileLogin(@Body() body: { accessToken: string }) {
    if (!body.accessToken) {
      throw new UnauthorizedException('Token de Google requerido');
    }

    // Exchange accessToken → user profile
    const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      picture?: string;
      name?: string;
    };

    if (!profile.email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google');
    }

    const user = await this.authService.findOrCreateByGoogle({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    const memberships = await this.tenantMembershipsService.findByUserId(user.id);

    let activeTenantId: string | null = null;
    let tenantRole: string | null = null;
    if (memberships.length === 1) {
      activeTenantId = memberships[0].tenantId;
      tenantRole = memberships[0].role;
    }

    const access_token = this.authService.signToken({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeTenantId,
      tenantRole,
    });

    return { ok: true, access_token, memberships };
  }

  // ── Self-registration: create tenant for new user ──────────────────────────

  @Post('register-tenant')
  async registerTenant(
    @CurrentUser() user: RequestUser,
    @Body() body: RegisterTenantDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenant = await this.tenantsService.selfRegister(
      user.id,
      body.name.trim(),
      body.phone?.trim() || undefined,
    );

    const access_token = this.authService.signToken({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeTenantId: tenant.id,
      tenantRole: 'owner',
    });

    // Set updated token as httpOnly cookie for web clients
    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return { ok: true, access_token };
  }
}
