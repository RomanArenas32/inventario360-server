import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformAdminModule } from '../platform-admin/platform-admin.module';
import { TenantMembershipsModule } from '../tenant-memberships/tenant-memberships.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TenantsModule, UsersModule, TenantMembershipsModule, PlatformAdminModule, AuthModule],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService],
})
export class AdminModule {}
