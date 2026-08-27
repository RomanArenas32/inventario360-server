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
    await this.sendPushToTokens(
      await this.getTokensForTenant(tenantId),
      title,
      body,
      data,
      'sendPushToTenant',
    );
  }

  /**
   * Sends push to all active tenant members EXCEPT the given user.
   * Used for new_sale: notify everyone but the seller.
   */
  async sendPushToTenantExcept(
    tenantId: string,
    excludeUserId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const tokens = await this.getTokensForTenant(tenantId, excludeUserId);
    await this.sendPushToTokens(tokens, title, body, data, 'sendPushToTenantExcept');
  }

  /**
   * Sends push to a single user within a tenant.
   * Used for turn_assigned: notify only the assigned staff member.
   */
  async sendPushToUser(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const membership = await this.membershipRepo.findOne({
        where: { tenantId, userId, isActive: true },
        relations: { user: true },
      });
      const token = membership?.user?.expoPushToken;
      if (!token?.startsWith('ExponentPushToken[')) return;
      await this.sendPushToTokens([token], title, body, data, 'sendPushToUser');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`sendPushToUser failed: ${message}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async getTokensForTenant(tenantId: string, excludeUserId?: string): Promise<string[]> {
    const memberships = await this.membershipRepo.find({
      where: { tenantId, isActive: true },
      relations: { user: true },
    });
    return memberships
      .filter((m) => !excludeUserId || m.userId !== excludeUserId)
      .map((m) => m.user?.expoPushToken)
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken['));
  }

  private async sendPushToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, unknown> | undefined,
    context: string,
  ): Promise<void> {
    if (tokens.length === 0) return;
    try {
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
        this.logger.warn(`${context}: Expo push API returned ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`${context} failed: ${message}`);
    }
  }
}
