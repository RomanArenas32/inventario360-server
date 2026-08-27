import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  create(
    tenantId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = this.repo.create({ tenantId, type, title, body, data: data ?? null });
    return this.repo.save(notification);
  }

  findByTenant(tenantId: string, onlyUnread = false): Promise<Notification[]> {
    const where = onlyUnread ? { tenantId, read: false } : { tenantId };
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async countUnread(tenantId: string): Promise<number> {
    return this.repo.count({ where: { tenantId, read: false } });
  }

  async markRead(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { read: true });
  }

  async markAllRead(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId, read: false }, { read: true });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
