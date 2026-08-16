import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { TenantMembership } from '../tenant-memberships/entities/tenant-membership.entity';
import { NotificationRepository } from './repositories/notification.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationRepository,
    @InjectRepository(TenantMembership)
    private readonly membershipRepo: Repository<TenantMembership>,
  ) {}

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

  async delete(id: string, tenantId: string) {
    await this.repo.delete(id, tenantId);
  }

  /**
   * Sends an Expo push notification to all active members of a tenant that have a registered token.
   * Fire-and-forget — errors are logged, never thrown.
   */
  async sendPushToTenant(
    tenantId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const memberships = await this.membershipRepo.find({
        where: { tenantId, isActive: true },
        relations: { user: true },
      });

      const tokens = memberships
        .map((m) => m.user?.expoPushToken)
        .filter((t): t is string => !!t && t.startsWith('ExponentPushToken['));

      if (tokens.length === 0) return;

      const messages = tokens.map((to) => ({
        to,
        title,
        body,
        data: data ?? {},
        sound: 'default' as const,
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo push API returned ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`sendPushToTenant failed: ${message}`);
    }
  }
}
