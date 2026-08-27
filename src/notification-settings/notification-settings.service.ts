import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import type { UpsertNotificationSettingsDto } from './dto/upsert-notification-settings.dto';
import { NotificationSettingsRepository } from './repositories/notification-settings.repository';
import type { Product } from '../products/entities/product.entity';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly repo: NotificationSettingsRepository,
    private readonly whatsapp: WhatsAppService,
  ) {}

  getSettings(tenantId: string) {
    return this.repo.findByTenantId(tenantId);
  }

  upsertSettings(tenantId: string, dto: UpsertNotificationSettingsDto) {
    return this.repo.upsert(tenantId, dto);
  }

  /**
   * Llamado desde ProductsService cuando el stock cae al mínimo.
   * Solo envía si el tenant tiene opt-in de WhatsApp y la alerta de stock bajo activada.
   */
  async notifyLowStock(tenantId: string, product: Product): Promise<void> {
    const settings = await this.repo.findByTenantId(tenantId);
    if (!settings?.whatsappOptIn || !settings.whatsappPhone || !settings.alertLowStock) return;
    void this.whatsapp.sendLowStockAlert(
      settings.whatsappPhone,
      product.name,
      product.stock,
      product.minStock,
    );
  }
}
