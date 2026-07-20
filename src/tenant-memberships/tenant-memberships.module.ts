import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMembership } from './entities/tenant-membership.entity';
import { TenantMembershipsService } from './tenant-memberships.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantMembership])],
  providers: [TenantMembershipsService],
  exports: [TenantMembershipsService],
})
export class TenantMembershipsModule {}
