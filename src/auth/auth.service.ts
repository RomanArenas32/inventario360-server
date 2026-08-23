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
    if (!user.password) throw new UnauthorizedException('Credenciales inválidas');
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

  async findOrCreateByGoogle(profile: { email: string; name?: string; picture?: string }) {
    let user = await this.usersService.findByEmail(profile.email);
    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        name: profile.name ?? profile.email.split('@')[0] ?? 'Usuario',
        avatarUrl: profile.picture ?? null,
      });
    } else {
      if (!user.isActive) throw new UnauthorizedException('Usuario inactivo');
      if (profile.picture) void this.usersService.upsertAvatar(user.id, profile.picture);
    }
    return user;
  }

  async loginByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('No existe una cuenta con este email');
    if (!user.isActive) throw new UnauthorizedException('Usuario inactivo');

    const memberships = await this.tenantMembershipsService.findByUserId(user.id);

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

    return { access_token: token, memberships, activeTenantId, userId: user.id };
  }

  signToken(payload: {
    sub: string;
    email: string;
    globalRole?: string;
    activeTenantId?: string | null;
    tenantRole?: string | null;
  }): string {
    return this.jwtService.sign(payload);
  }

  async saveAvatar(userId: string, avatarUrl: string): Promise<void> {
    await this.usersService.upsertAvatar(userId, avatarUrl);
  }

  getUser(userId: string) {
    return this.usersService.findById(userId);
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
