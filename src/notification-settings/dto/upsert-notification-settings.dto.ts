import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertNotificationSettingsDto {
  @IsOptional()
  @IsString()
  whatsappPhone?: string | null;

  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  alertLowStock?: boolean;
}
