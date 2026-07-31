import { ConflictException, Injectable } from '@nestjs/common';
import { TenantRole } from '../common/enums/tenant-role.enum';
import { TenantMembershipRepository } from './repositories/tenant-membership.repository';

@Injectable()
export class TenantMembershipsService {
  constructor(private readonly membershipRepository: TenantMembershipRepository) {}

  async create(data: { userId: string; tenantId: string; role: TenantRole }) {
    const existing = await this.membershipRepository.findMembership(data.userId, data.tenantId);
    if (existing) throw new ConflictException('El usuario ya es miembro de este negocio');
    return this.membershipRepository.save(data);
  }

  findByUserId(userId: string) {
    return this.membershipRepository.findByUserId(userId);
  }

  findMembership(userId: string, tenantId: string) {
    return this.membershipRepository.findMembership(userId, tenantId);
  }

  findByTenantId(tenantId: string, filters: { search?: string; role?: TenantRole } = {}) {
    return this.membershipRepository.findByTenantId(tenantId, filters);
  }

  deleteByTenantId(tenantId: string) {
    return this.membershipRepository.deleteByTenantId(tenantId);
  }

  updateRole(membershipId: string, role: TenantRole) {
    return this.membershipRepository.updateRole(membershipId, role);
  }

  deleteByUserId(userId: string, tenantId: string) {
    return this.membershipRepository.deleteByUserId(userId, tenantId);
  }
}
