import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from '../common/enums/business-type.enum';
import { Plan } from '../common/enums/plan.enum';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail/mail.service';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { UsersService } from '../users/users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { Tenant } from './entities/tenant.entity';

interface TenantOptions {
  phone?: string;
  plan?: Plan;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    private readonly usersService: UsersService,
    private readonly membershipsService: TenantMembershipsService,
    @Inject(forwardRef(() => InvitationsService))
    private readonly invitationsService: InvitationsService,
    private readonly mailService: MailService,
  ) {}

  create(name: string, businessType?: BusinessType, options: TenantOptions = {}): Promise<Tenant> {
    const tenant = this.tenantsRepository.create({ name, businessType, ...options });
    return this.tenantsRepository.save(tenant);
  }

  async completeOnboarding(tenantId: string, businessType: BusinessType): Promise<Tenant> {
    await this.tenantsRepository.update(tenantId, { businessType, isOnboarded: true });
    return this.tenantsRepository.findOneOrFail({ where: { id: tenantId } });
  }

  async findAll() {
    const tenants = await this.tenantsRepository.find({
      order: { createdAt: 'DESC' },
      relations: { memberships: { user: true } },
    });
    return tenants.map((t) => {
      const ownerMembership = t.memberships?.find((m) => m.role === TenantRole.Owner);
      const { memberships: _m, ...rest } = t;
      return {
        ...rest,
        user: ownerMembership?.user
          ? { name: ownerMembership.user.name, email: ownerMembership.user.email }
          : null,
      };
    });
  }

  findById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.tenantsRepository.update(id, data);
    return this.tenantsRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.tenantsRepository.delete(id);
  }

  // ── Member management ─────────────────────────────────────────────────────

  async getMembers(tenantId: string) {
    const memberships = await this.membershipsService.findByTenantId(tenantId);
    return memberships.map(({ user, role, isActive, createdAt, id, userId }) => ({
      membershipId: id,
      userId,
      name: user.name,
      email: user.email,
      role,
      isActive,
      joinedAt: createdAt,
    }));
  }

  async addMember(tenantId: string, dto: AddMemberDto) {
    const tenant = await this.tenantsRepository.findOneOrFail({ where: { id: tenantId } });
    const role = dto.role ?? TenantRole.Staff;
    const invitation = await this.invitationsService.create(dto.email, tenantId, role);
    await this.mailService.sendTenantInvitation(dto.email, tenant.name, invitation.token);
    return { ok: true, invitationSent: true };
  }

  async updateMemberRole(tenantId: string, userId: string, role: TenantRole) {
    const membership = await this.membershipsService.findMembership(userId, tenantId);
    if (!membership) throw new NotFoundException('Miembro no encontrado');
    await this.membershipsService.updateRole(membership.id, role);
    return { userId, tenantId, role };
  }

  async removeMember(tenantId: string, userId: string) {
    const membership = await this.membershipsService.findMembership(userId, tenantId);
    if (!membership) throw new NotFoundException('Miembro no encontrado');
    await this.membershipsService.deleteByUserId(userId, tenantId);
  }
}
