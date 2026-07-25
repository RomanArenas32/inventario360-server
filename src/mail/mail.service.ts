import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM') ?? 'Inventario360 <inventario360.soporte@gmail.com>';
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.getOrThrow<string>('MAIL_USER'),
        pass: config.getOrThrow<string>('MAIL_PASS'),
      },
    });
  }

  async sendTenantInvitation(email: string, tenantName: string, token: string) {
    const link = `${this.appUrl}/login/invitation?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: `Invitación a ${tenantName} en Inventario360`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="margin: 0 0 8px;">Fuiste invitado a registrar tu local comercial ${tenantName}</h2>
            <p style="color: #555; margin: 0 0 24px;">
              Hacé click en el botón para activar tu cuenta. Este link expira en 7 días.
            </p>
            <a
              href="${link}"
              style="
                display: inline-block;
                background: #18181b;
                color: #fff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
              "
            >
              Activar cuenta
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Si no esperabas esta invitación podés ignorar este correo.
            </p>
          </div>
        `,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Error al enviar email:', message);
      throw new InternalServerErrorException(`Error al enviar email: ${message}`);
    }
  }
}
