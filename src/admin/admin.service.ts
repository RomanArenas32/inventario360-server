import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.usersService.findByEmail(dto.ownerEmail);
    if (existing) throw new ConflictException('El email ya está registrado');

    const tenant = await this.tenantsService.create(dto.businessName, dto.businessType, {
      phone: dto.phone,
      plan: dto.plan,
    });

    const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);
    const user = await this.usersService.create({
      name: dto.ownerName,
      email: dto.ownerEmail,
      password: hashedPassword,
      role: Role.Tenant,
      tenantId: tenant.id,
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
    return this.tenantsService.remove(id);
  }
}
