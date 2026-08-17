import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SaleRepository } from './repositories/sale.repository';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem]),
    NotificationsModule,
    NotificationSettingsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, SaleRepository],
})
export class SalesModule {}
