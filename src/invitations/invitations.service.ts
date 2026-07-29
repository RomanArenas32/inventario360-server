import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { InvitationRepository } from './repositories/invitation.repository';

const EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  constructor(private readonly invitationRepository: InvitationRepository) {}

  async create(
    email: string,
    tenantId: string,
    role: TenantRole = TenantRole.Owner,
    memberName?: string,
  ) {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);
    return this.invitationRepository.save({
      token,
      email,
      tenantId,
      memberName,
      role,
      expiresAt,
      acceptedAt: null,
    });
  }

  async validate(token: string) {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) throw new BadRequestException('Invitación inválida');
    if (invitation.acceptedAt) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('La invitación expiró');
    return invitation;
  }

  findAllPendingByTenant(tenantId: string) {
    return this.invitationRepository.findAllPendingByTenant(tenantId);
  }

  findPendingByEmailAndTenant(email: string, tenantId: string) {
    return this.invitationRepository.findPendingByEmailAndTenant(email, tenantId);
  }

  markAccepted(id: string) {
    return this.invitationRepository.markAccepted(id);
  }

  async revoke(id: string): Promise<void> {
    const invitation = await this.invitationRepository.findById(id);
    if (!invitation) throw new BadRequestException('Invitación no encontrada');
    if (invitation.acceptedAt) throw new BadRequestException('Esta invitación ya fue aceptada');
    await this.invitationRepository.deleteById(id);
  }

  findPendingByTenantIds(tenantIds: string[]) {
    return this.invitationRepository.findPendingByTenantIds(tenantIds);
  }

  findAllLatestByTenantIds(tenantIds: string[]) {
    return this.invitationRepository.findAllLatestByTenantIds(tenantIds);
  }
}
