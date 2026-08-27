import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings } from '../entities/notification-settings.entity';

@Injectable()
export class NotificationSettingsRepository {
  constructor(
    @InjectRepository(NotificationSettings)
    private readonly repo: Repository<NotificationSettings>,
  ) {}

  async findByTenantId(tenantId: string): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  async upsert(
    tenantId: string,
    data: Partial<Omit<NotificationSettings, 'id' | 'tenantId' | 'updatedAt'>>,
  ): Promise<NotificationSettings> {
    const existing = await this.findByTenantId(tenantId);
    if (existing) {
      await this.repo.update(existing.id, data);
      return this.repo.findOneOrFail({ where: { tenantId } });
    }
    const created = this.repo.create({ tenantId, ...data });
    return this.repo.save(created);
  }
}
