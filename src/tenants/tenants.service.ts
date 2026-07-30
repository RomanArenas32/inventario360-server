import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
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

  async revokeInvitation(tenantId: string, invitationId: string) {
    const invitations = await this.invitationsService.findAllPendingByTenant(tenantId);
    const belongs = invitations.some((inv) => inv.id === invitationId);
    if (!belongs) throw new NotFoundException('Invitación no encontrada');
    await this.invitationsService.revoke(invitationId);
  }

  async getPendingInvitations(tenantId: string) {
    const invitations = await this.invitationsService.findAllPendingByTenant(tenantId);
    return invitations.map((inv) => ({
      invitationId: inv.id,
      email: inv.email,
      name: inv.memberName ?? inv.email,
      role: inv.role,
      sentAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }

  async addMember(tenantId: string, dto: AddMemberDto) {
    const tenant = await this.tenantRepository.findByIdOrFail(tenantId);
    const role = dto.role ?? TenantRole.Staff;

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      const membership = await this.membershipsService.findMembership(existingUser.id, tenantId);
      if (membership) throw new ConflictException('ALREADY_A_MEMBER');
    }

    if (!dto.resend) {
      const pending = await this.invitationsService.findPendingByEmailAndTenant(
        dto.email,
        tenantId,
      );
      if (pending) throw new ConflictException('INVITATION_ALREADY_SENT');
    }

    const invitation = await this.invitationsService.create(dto.email, tenantId, role, dto.name);
    await this.mailService.sendTenantInvitation(dto.email, tenant.name, invitation.token, role);
    return { ok: true, invitationSent: true };
  }

  async updateMember(tenantId: string, userId: string, data: { name?: string; role?: TenantRole }) {
    const membership = await this.membershipsService.findMembership(userId, tenantId);
    if (!membership) throw new NotFoundException('Miembro no encontrado');
    if (data.name) await this.usersService.updateProfile(userId, data.name);
    if (data.role) await this.membershipsService.updateRole(membership.id, data.role);
    return { ok: true };
  }

  async removeMember(tenantId: string, userId: string) {
    const membership = await this.membershipsService.findMembership(userId, tenantId);
    if (!membership) throw new NotFoundException('Miembro no encontrado');
    await this.membershipsService.deleteByUserId(userId, tenantId);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    const tenant = await this.tenantRepository.findByIdOrFail(tenantId);
    return { staffModules: tenant.staffModules };
  }

  async updateSettings(tenantId: string, staffModules: string[]) {
    await this.tenantRepository.update(tenantId, { staffModules });
    return { staffModules };
  }
}
