import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementRepository } from './repositories/stock-movement.repository';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement]), NotificationSettingsModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService, StockMovementRepository],
})
export class StockMovementsModule {}
