import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TenantsModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
