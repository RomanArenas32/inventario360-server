import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnDto } from './dto/update-turn.dto';
import { TurnRepository } from './repositories/turn.repository';

@Injectable()
export class TurnsService {
  private readonly logger = new Logger(TurnsService.name);

  constructor(
    private readonly turnRepository: TurnRepository,
    private readonly notificationSettings: NotificationSettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  findByDate(tenantId: string, date: string) {
    return this.turnRepository.findByDate(tenantId, date);
  }

  findById(id: string, tenantId: string) {
    return this.turnRepository.findByIdOrFail(id, tenantId);
  }

  findHistory(tenantId: string, search = '', limit = 30, offset = 0) {
    return this.turnRepository.findHistory(tenantId, search, limit, offset);
  }

  async create(dto: CreateTurnDto, tenantId: string, userId: string) {
    let date: string;
    if (dto.startTime) {
      date = dto.startTime.split('T')[0]!;
    } else if (dto.date) {
      date = dto.date;
    } else {
      date = new Date().toISOString().split('T')[0]!;
    }

    const assignedUserId = dto.assignedUserId ?? userId;

    const turn = await this.turnRepository.save({
      clientName: dto.clientName.trim(),
      clientPhone: dto.clientPhone?.trim() || undefined,
      service: dto.service.trim(),
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      date,
      duration: dto.duration,
      notes: dto.notes?.trim() || undefined,
      price: dto.price ?? null,
      tenantId,
      assignedUserId,
    });

    // Notify assigned user if someone else created this turn for them
    if (assignedUserId !== userId) {
      void this.fireTurnAssigned(
        tenantId,
        assignedUserId,
        dto.clientName.trim(),
        dto.service.trim(),
      );
    }

    return turn;
  }

  async update(id: string, tenantId: string, dto: UpdateTurnDto, actorUserId?: string) {
    let date: string | undefined;
    if (dto.startTime !== undefined) {
      date = dto.startTime ? dto.startTime.split('T')[0] : dto.date;
    } else if (dto.date) {
      date = dto.date;
    }

    const patch: Record<string, unknown> = {};
    if (dto.clientName !== undefined) patch.clientName = dto.clientName.trim();
    if (dto.clientPhone !== undefined) patch.clientPhone = dto.clientPhone?.trim() || null;
    if (dto.service !== undefined) patch.service = dto.service.trim();
    if (dto.startTime !== undefined)
      patch.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (date !== undefined) patch.date = date;
    if (dto.duration !== undefined) patch.duration = dto.duration;
    if (dto.notes !== undefined) patch.notes = dto.notes?.trim() || null;
    if (dto.assignedUserId !== undefined) patch.assignedUserId = dto.assignedUserId;
    if (dto.price !== undefined) patch.price = dto.price;
    if (dto.status !== undefined) patch.status = dto.status;

    const turn = await this.turnRepository.update(id, tenantId, patch);

    // Notify the newly assigned user if someone else re-assigned this turn
    if (
      dto.assignedUserId !== undefined &&
      dto.assignedUserId !== null &&
      actorUserId !== undefined &&
      dto.assignedUserId !== actorUserId
    ) {
      const clientName = (dto.clientName ?? turn.clientName).trim();
      const service = (dto.service ?? turn.service).trim();
      void this.fireTurnAssigned(tenantId, dto.assignedUserId, clientName, service);
    }

    return turn;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fireTurnAssigned(
    tenantId: string,
    assignedUserId: string,
    clientName: string,
    service: string,
  ): Promise<void> {
    try {
      const settings = await this.notificationSettings.getSettings(tenantId);
      if (!settings?.alertTurnAssigned) return;
      const title = 'Turno asignado';
      const body = `${clientName} — ${service}`;
      void this.notifications
        .create(tenantId, NotificationType.TurnAssigned, title, body, { assignedUserId })
        .catch((err: unknown) => this.logger.error(`create turn notification: ${String(err)}`));
      void this.notifications
        .sendPushToUser(tenantId, assignedUserId, title, body)
        .catch((err: unknown) => this.logger.error(`push turn assigned: ${String(err)}`));
    } catch (err) {
      this.logger.error(`fireTurnAssigned: ${String(err)}`);
    }
  }
}
