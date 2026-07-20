import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdmin } from './entities/platform-admin.entity';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAdmin])],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
