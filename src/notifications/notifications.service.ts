import { Injectable } from '@nestjs/common';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificationRepository } from './repositories/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationRepository) {}

  create(
    tenantId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.repo.create(tenantId, type, title, body, data);
  }

  getAll(tenantId: string) {
    return this.repo.findByTenant(tenantId);
  }

  async getUnreadCount(tenantId: string) {
    const count = await this.repo.countUnread(tenantId);
    return { count };
  }

  async markRead(id: string, tenantId: string) {
    await this.repo.markRead(id, tenantId);
  }

  async markAllRead(tenantId: string) {
    await this.repo.markAllRead(tenantId);
  }
}
