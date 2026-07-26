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

  create(name: string, businessType?: BusinessType, options: { phone?: string; plan?: Plan } = {}): Promise<Tenant> {
    const tenant = this.repo.create({ name, businessType, ...options });
    return this.repo.save(tenant);
  }

  async completeOnboarding(tenantId: string, businessType: BusinessType): Promise<Tenant> {
    await this.repo.update(tenantId, { businessType, isOnboarded: true });
    return this.repo.findOneOrFail({ where: { id: tenantId } });
  }

  async findAll() {
    const tenants = await this.repo.find({
      order: { createdAt: 'DESC' },
      relations: { memberships: { user: true } },
    });
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
