import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly tenantMembershipsService: TenantMembershipsService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const tenant = await this.tenantsService.create(dto.businessName, dto.businessType, {
      phone: dto.phone,
      plan: dto.plan,
    });

    // Find existing user or create a new one
    let user = await this.usersService.findByEmail(dto.ownerEmail);
    if (!user) {
      const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);
      user = await this.usersService.create({
        name: dto.ownerName,
        email: dto.ownerEmail,
        password: hashedPassword,
        globalRole: Role.User,
      });
    }

    await this.tenantMembershipsService.create({
      userId: user.id,
      tenantId: tenant.id,
      role: TenantRole.Owner,
    });

    const { password: _p, ...safeUser } = user;
    return { tenant, user: safeUser };
  }

  findAllTenants() {
    return this.tenantsService.findAll();
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return this.tenantsService.update(id, dto);
  }

  async deleteTenant(id: string) {
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    await this.tenantMembershipsService.deleteByTenantId(id);
    return this.tenantsService.remove(id);
  }
}
