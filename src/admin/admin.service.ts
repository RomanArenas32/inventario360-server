import { Injectable, NotFoundException } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail/mail.service';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { UsersService } from '../users/users.service';
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
    private readonly usersService: UsersService,
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
    const invMap = await this.invitationsService.findAllLatestByTenantIds(tenantIds);
    const now = new Date();
    return tenants.map((t) => {
      const inv = invMap.get(t.id);
      return {
        ...t,
        invitation: inv
          ? {
              email: inv.email,
              sentAt: inv.sentAt,
              acceptedAt: inv.acceptedAt,
              expiresAt: inv.expiresAt,
              expired: !inv.acceptedAt && now > inv.expiresAt,
            }
          : null,
      };
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const updated = await this.tenantRepository.update(id, dto);

    if (dto.isActive === false && tenant.isActive === true) {
      // Tenant just suspended — deactivate members with no other active tenant
      const memberships = await this.tenantMembershipsService.findByTenantId(id);
      await Promise.all(
        memberships.map(async (m) => {
          const remaining = await this.tenantMembershipsService.findByUserId(m.userId);
          if (remaining.length === 0) {
            await this.usersService.deactivate(m.userId);
          }
        }),
      );
    } else if (dto.isActive === true && tenant.isActive === false) {
      // Tenant reactivated — reactivate all its members
      const memberships = await this.tenantMembershipsService.findByTenantId(id);
      await Promise.all(memberships.map((m) => this.usersService.reactivate(m.userId)));
    }

    return updated;
  }

  async deleteTenant(id: string) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Capture member user IDs before deleting memberships
    const memberships = await this.tenantMembershipsService.findByTenantId(id);
    const userIds = memberships.map((m) => m.userId);

    await this.tenantMembershipsService.deleteByTenantId(id);
    await this.tenantRepository.delete(id);

    // Deactivate users that no longer belong to any tenant
    await Promise.all(
      userIds.map(async (userId) => {
        const remaining = await this.tenantMembershipsService.findByUserId(userId);
        if (remaining.length === 0) {
          await this.usersService.deactivate(userId);
        }
      }),
    );
  }
}
