import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsModule } from '../invitations/invitations.module';
import { MailModule } from '../mail/mail.module';
import { TenantMembershipsModule } from '../tenant-memberships/tenant-memberships.module';
import { UsersModule } from '../users/users.module';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), TenantMembershipsModule, UsersModule, forwardRef(() => InvitationsModule), MailModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
