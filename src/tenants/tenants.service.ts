import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail/mail.service';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { UsersService } from '../users/users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { TenantRepository } from './repositories/tenant.repository';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly usersService: UsersService,
    private readonly membershipsService: TenantMembershipsService,
    @Inject(forwardRef(() => InvitationsService))
    private readonly invitationsService: InvitationsService,
    private readonly mailService: MailService,
  ) {}

  create(...args: Parameters<TenantRepository['create']>) {
    return this.tenantRepository.create(...args);
  }

  completeOnboarding(...args: Parameters<TenantRepository['completeOnboarding']>) {
    return this.tenantRepository.completeOnboarding(...args);
  }

  findAll() {
    return this.tenantRepository.findAll();
  }

  findById(id: string) {
    return this.tenantRepository.findById(id);
  }

  update(...args: Parameters<TenantRepository['update']>) {
    return this.tenantRepository.update(...args);
  }

  remove(id: string) {
    return this.tenantRepository.delete(id);
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
    const tenant = await this.tenantRepository.findByIdOrFail(tenantId);
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
