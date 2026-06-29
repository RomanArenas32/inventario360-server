import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from '../common/enums/business-type.enum';
import { Plan } from '../common/enums/plan.enum';
import { Tenant } from './entities/tenant.entity';

interface TenantOptions {
  phone?: string;
  plan?: Plan;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
  ) {}

  create(name: string, businessType?: BusinessType, options: TenantOptions = {}): Promise<Tenant> {
    const tenant = this.tenantsRepository.create({ name, businessType, ...options });
    return this.tenantsRepository.save(tenant);
  }

  async completeOnboarding(tenantId: string, businessType: BusinessType): Promise<Tenant> {
    await this.tenantsRepository.update(tenantId, { businessType, isOnboarded: true });
    return this.tenantsRepository.findOneOrFail({ where: { id: tenantId } });
  }

  findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.tenantsRepository.update(id, data);
    return this.tenantsRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.tenantsRepository.delete(id);
  }
}
