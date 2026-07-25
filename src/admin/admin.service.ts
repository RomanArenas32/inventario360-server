import { Injectable, NotFoundException } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail/mail.service';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantMembershipsService: TenantMembershipsService,
    private readonly invitationsService: InvitationsService,
    private readonly mailService: MailService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const tenant = await this.tenantsService.create(dto.businessName, dto.businessType, {
      phone: dto.phone,
      plan: dto.plan,
    });

    const invitation = await this.invitationsService.create(dto.ownerEmail, tenant.id);
    await this.mailService.sendTenantInvitation(dto.ownerEmail, tenant.name, invitation.token);

    return { tenant, invitationSent: true };
  }

  findAllTenants() {
    return this.tenantsService.findAll();
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return this.tenantsService.update(id, dto);
  }

  async deleteTenant(id: string) {
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    await this.tenantMembershipsService.deleteByTenantId(id);
    return this.tenantsService.remove(id);
  }
}
