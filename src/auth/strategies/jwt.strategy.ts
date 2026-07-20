import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { TenantRole } from '../../common/enums/tenant-role.enum';
import type { RequestUser } from '../../common/types/request-user.type';
import { PlatformAdminService } from '../../platform-admin/platform-admin.service';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  globalRole: string;
  isAdmin: boolean;
  activeTenantId: string | null;
  tenantRole: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly platformAdminService: PlatformAdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req.cookies as Record<string, string>)?.inv360_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.isAdmin) {
      const admin = await this.platformAdminService.findById(payload.sub);
      if (!admin || !admin.isActive) throw new UnauthorizedException();
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        globalRole: Role.Admin,
        isActive: admin.isActive,
        isAdmin: true,
        activeTenantId: null,
        tenantRole: null,
      };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      globalRole: user.globalRole,
      isActive: user.isActive,
      isAdmin: false,
      activeTenantId: payload.activeTenantId,
      tenantRole: (payload.tenantRole as TenantRole) ?? null,
    };
  }
}
