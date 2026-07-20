import { Body, Controller, ForbiddenException, Get, Post, Res, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { PlatformAdminService } from '../platform-admin/platform-admin.service';
import { LoginDto } from '../auth/dto/login.dto';

const COOKIE_NAME = 'inv360_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly platformAdminService: PlatformAdminService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const admin = await this.platformAdminService.findByEmail(dto.email);
    if (!admin) throw new UnauthorizedException('Credenciales inválidas');
    const match = await bcrypt.compare(dto.password, admin.password);
    if (!match) throw new UnauthorizedException('Credenciales inválidas');
    if (!admin.isActive) throw new UnauthorizedException('Usuario inactivo');

    const token = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      globalRole: Role.Admin,
      isAdmin: true,
      activeTenantId: null,
      tenantRole: null,
    });

    res.cookie(COOKIE_NAME, token, {
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

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    if (!user.isAdmin) throw new ForbiddenException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.globalRole,
    };
  }
}
