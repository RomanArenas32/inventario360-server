import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdmin } from './entities/platform-admin.entity';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminRepository } from './repositories/platform-admin.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAdmin])],
  providers: [PlatformAdminService, PlatformAdminRepository],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
