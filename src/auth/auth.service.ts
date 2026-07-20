import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantMembershipsService: TenantMembershipsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.isActive) throw new UnauthorizedException('Usuario inactivo');

    const memberships = await this.tenantMembershipsService.findByUserId(user.id);

    // Auto-select tenant if the user belongs to exactly one
    let activeTenantId: string | null = null;
    let tenantRole: string | null = null;
    if (memberships.length === 1) {
      activeTenantId = memberships[0].tenantId;
      tenantRole = memberships[0].role;
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeTenantId,
      tenantRole,
    });

    return { access_token: token, memberships };
  }

  async switchTenant(userId: string, tenantId: string) {
    const membership = await this.tenantMembershipsService.findMembership(userId, tenantId);
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('No sos miembro de este negocio');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeTenantId: tenantId,
      tenantRole: membership.role,
    });

    return { access_token: token };
  }
}
