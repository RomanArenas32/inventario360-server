import { Body, Controller, Get, Post, Res } from '@nestjs/common';
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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.globalRole,
      tenantRole: user.tenantRole,
      tenant: tenant ? { id: tenant.id, name: tenant.name, isOnboarded: tenant.isOnboarded } : null,
      tenants: memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenant?.name ?? '',
        role: m.role,
      })),
    };
  }
}
