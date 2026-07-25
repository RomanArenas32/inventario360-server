import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { TenantInvitation } from './entities/tenant-invitation.entity';

const EXPIRY_DAYS = 7;

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(TenantInvitation)
    private readonly repo: Repository<TenantInvitation>,
  ) {}

  async create(email: string, tenantId: string, role: TenantRole = TenantRole.Owner) {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

    const invitation = this.repo.create({ token, email, tenantId, role, expiresAt, acceptedAt: null });
    return this.repo.save(invitation);
  }

  async validate(token: string) {
    const invitation = await this.repo.findOne({ where: { token } });
    if (!invitation) throw new BadRequestException('Invitación inválida');
    if (invitation.acceptedAt) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('La invitación expiró');
    return invitation;
  }

  async markAccepted(id: string) {
    await this.repo.update(id, { acceptedAt: new Date() });
  }
}
