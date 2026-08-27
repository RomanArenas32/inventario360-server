import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    this.apiToken = this.config.get<string>('META_API_TOKEN') ?? '';
    this.phoneNumberId = this.config.get<string>('META_PHONE_NUMBER_ID') ?? '';
  }

  private isConfigured(): boolean {
    return Boolean(this.apiToken && this.phoneNumberId);
  }

  /**
   * Normaliza el número al formato E.164 sin el '+'.
   * Argentina: 11 → 5491112345678
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Envía la alerta de stock bajo al dueño del tenant.
   * Template: inventario360_stock_bajo
   * Parámetros: {{1}} nombre del producto, {{2}} stock actual, {{3}} stock mínimo
   */
  async sendLowStockAlert(
    to: string,
    productName: string,
    currentStock: number,
    minStock: number,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('WhatsApp no configurado — META_API_TOKEN o META_PHONE_NUMBER_ID faltantes');
      return;
    }

    const templateName =
      this.config.get<string>('META_STOCK_LOW_TEMPLATE') ?? 'inventario360_stock_bajo';

    const body = {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es_AR' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: productName },
              { type: 'text', text: String(currentStock) },
              { type: 'text', text: String(minStock) },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Error Meta API: ${err}`);
      } else {
        this.logger.log(`Alerta de stock enviada a ${to} — ${productName}`);
      }
    } catch (err) {
      this.logger.error('Error al conectar con Meta API', err);
    }
  }
}
