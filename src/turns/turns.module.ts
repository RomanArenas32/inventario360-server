import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turn } from './entities/turn.entity';
import { TurnRepository } from './repositories/turn.repository';
import { TurnsController } from './turns.controller';
import { TurnsService } from './turns.service';

@Module({
  imports: [TypeOrmModule.forFeature([Turn])],
  controllers: [TurnsController],
  providers: [TurnsService, TurnRepository],
})
export class TurnsModule {}
