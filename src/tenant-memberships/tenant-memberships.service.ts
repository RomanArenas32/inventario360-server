import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { TenantMembership } from './entities/tenant-membership.entity';

@Injectable()
export class TenantMembershipsService {
  constructor(
    @InjectRepository(TenantMembership)
    private readonly repo: Repository<TenantMembership>,
  ) {}

  async create(data: {
    userId: string;
    tenantId: string;
    role: TenantRole;
  }): Promise<TenantMembership> {
    const existing = await this.repo.findOne({
      where: { userId: data.userId, tenantId: data.tenantId },
    });
    if (existing) throw new ConflictException('El usuario ya es miembro de este negocio');
    const membership = this.repo.create(data);
    return this.repo.save(membership);
  }

  findByUserId(userId: string): Promise<TenantMembership[]> {
    return this.repo.find({
      where: { userId, isActive: true },
      relations: { tenant: true },
    });
  }

  findMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
    return this.repo.findOne({ where: { userId, tenantId } });
  }

  findByTenantId(tenantId: string): Promise<TenantMembership[]> {
    return this.repo.find({
      where: { tenantId },
      relations: { user: true },
    });
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    await this.repo.delete({ tenantId });
  }

  async updateRole(membershipId: string, role: TenantRole): Promise<void> {
    await this.repo.update(membershipId, { role });
  }

  async deleteByUserId(userId: string, tenantId: string): Promise<void> {
    await this.repo.delete({ userId, tenantId });
  }
}
