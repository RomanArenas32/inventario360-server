import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Turn } from './entities/turn.entity';
import { TurnRepository } from './repositories/turn.repository';
import { TurnsController } from './turns.controller';
import { TurnsService } from './turns.service';

@Module({
  imports: [TypeOrmModule.forFeature([Turn]), NotificationsModule, NotificationSettingsModule],
  controllers: [TurnsController],
  providers: [TurnsService, TurnRepository],
})
export class TurnsModule {}
