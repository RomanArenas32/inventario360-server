import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { TenantRole } from '../../common/enums/tenant-role.enum';
import { TenantInvitation } from '../entities/tenant-invitation.entity';

@Injectable()
export class InvitationRepository {
  constructor(
    @InjectRepository(TenantInvitation)
    private readonly repo: Repository<TenantInvitation>,
  ) {}

  save(data: {
    token: string;
    email: string;
    tenantId: string;
    memberName?: string;
    role: TenantRole;
    expiresAt: Date;
    acceptedAt: null;
  }): Promise<TenantInvitation> {
    const invitation = this.repo.create(data);
    return this.repo.save(invitation);
  }

  findById(id: string): Promise<TenantInvitation | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByToken(token: string): Promise<TenantInvitation | null> {
    return this.repo.findOne({ where: { token } });
  }

  findAllPendingByTenant(tenantId: string): Promise<TenantInvitation[]> {
    return this.repo.find({
      where: { tenantId, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findPendingByEmailAndTenant(email: string, tenantId: string): Promise<TenantInvitation | null> {
    return this.repo.findOne({
      where: { email, tenantId, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findAllPendingByEmail(email: string): Promise<TenantInvitation[]> {
    return this.repo.find({
      where: { email, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async markAccepted(id: string): Promise<void> {
    await this.repo.update(id, { acceptedAt: new Date() });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findPendingByTenantIds(
    tenantIds: string[],
  ): Promise<Map<string, { email: string; expiresAt: Date }>> {
    if (tenantIds.length === 0) return new Map();
    const invitations = await this.repo.find({
      where: { tenantId: In(tenantIds), acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const map = new Map<string, { email: string; expiresAt: Date }>();
    for (const inv of invitations) {
      if (!map.has(inv.tenantId)) {
        map.set(inv.tenantId, { email: inv.email, expiresAt: inv.expiresAt });
      }
    }
    return map;
  }

  async findAllLatestByTenantIds(
    tenantIds: string[],
  ): Promise<
    Map<string, { email: string; sentAt: Date; acceptedAt: Date | null; expiresAt: Date }>
  > {
    if (tenantIds.length === 0) return new Map();
    const invitations = await this.repo.find({
      where: { tenantId: In(tenantIds) },
      order: { createdAt: 'DESC' },
    });
    const map = new Map<
      string,
      { email: string; sentAt: Date; acceptedAt: Date | null; expiresAt: Date }
    >();
    for (const inv of invitations) {
      if (!map.has(inv.tenantId)) {
        map.set(inv.tenantId, {
          email: inv.email,
          sentAt: inv.createdAt,
          acceptedAt: inv.acceptedAt,
          expiresAt: inv.expiresAt,
        });
      }
    }
    return map;
  }
}
