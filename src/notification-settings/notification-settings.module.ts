import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationSettings } from './entities/notification-settings.entity';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsRepository } from './repositories/notification-settings.repository';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSettings]), WhatsAppModule],
  controllers: [NotificationSettingsController],
  providers: [NotificationSettingsService, NotificationSettingsRepository],
  exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
