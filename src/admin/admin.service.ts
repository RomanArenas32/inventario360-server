import { Injectable, NotFoundException } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail/mail.service';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from '../tenants/repositories/tenant.repository';

@Injectable()
export class AdminService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantMembershipsService: TenantMembershipsService,
    private readonly invitationsService: InvitationsService,
    private readonly mailService: MailService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const tenant = await this.tenantRepository.create(dto.businessName, dto.businessType, {
      phone: dto.phone,
      plan: dto.plan,
    });

    const invitation = await this.invitationsService.create(dto.ownerEmail, tenant.id);
    await this.mailService.sendTenantInvitation(dto.ownerEmail, tenant.name, invitation.token);

    return { tenant, invitationSent: true };
  }

  async findAllTenants() {
    const tenants = await this.tenantRepository.findAll();
    const tenantIds = tenants.map((t) => t.id);
    const pendingMap = await this.invitationsService.findPendingByTenantIds(tenantIds);
    const now = new Date();
    return tenants.map((t) => {
      const inv = pendingMap.get(t.id);
      return {
        ...t,
        pendingInvitation: inv
          ? { email: inv.email, expired: now > inv.expiresAt }
          : null,
      };
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return this.tenantRepository.update(id, dto);
  }

  async deleteTenant(id: string) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    console.log('Deleting tenant with ID:', id);
    await this.tenantMembershipsService.deleteByTenantId(id);
    return this.tenantRepository.delete(id);
  }
}
