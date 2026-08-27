import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from '../../common/enums/business-type.enum';
import { Plan } from '../../common/enums/plan.enum';
import { TenantRole } from '../../common/enums/tenant-role.enum';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  create(
    name: string,
    businessType?: BusinessType,
    options: { phone?: string; plan?: Plan; trialEndsAt?: Date | null } = {},
  ): Promise<Tenant> {
    const tenant = this.repo.create({ name, businessType, ...options });
    return this.repo.save(tenant);
  }

  async completeOnboarding(
    tenantId: string,
    businessType: BusinessType,
    extras: { businessName?: string; phone?: string } = {},
  ): Promise<Tenant> {
    const update: Partial<Tenant> = { businessType, isOnboarded: true };
    if (extras.businessName) update.name = extras.businessName;
    if (extras.phone) update.phone = extras.phone;
    await this.repo.update(tenantId, update);
    return this.repo.findOneOrFail({ where: { id: tenantId } });
  }

  async findAll(filters: { search?: string; plan?: Plan; isActive?: boolean } = {}) {
    const qb = this.repo
      .createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.memberships', 'membership')
      .leftJoinAndSelect('membership.user', 'user')
      .orderBy('tenant.createdAt', 'DESC');

    if (filters.search) {
      qb.andWhere(
        '(LOWER(tenant.name) LIKE :search OR LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }
    if (filters.plan) {
      qb.andWhere('tenant.plan = :plan', { plan: filters.plan });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('tenant.isActive = :isActive', { isActive: filters.isActive });
    }

    const tenants = await qb.getMany();
    return tenants.map((t) => {
      const ownerMembership = t.memberships?.find((m) => m.role === TenantRole.Owner);
      const { memberships: _m, ...rest } = t;
      return {
        ...rest,
        user: ownerMembership?.user
          ? { name: ownerMembership.user.name, email: ownerMembership.user.email }
          : null,
      };
    });
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdOrFail(id: string): Promise<Tenant> {
    return this.repo.findOneOrFail({ where: { id } });
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
