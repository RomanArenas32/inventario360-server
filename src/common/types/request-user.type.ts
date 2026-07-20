import type { Role } from '../enums/role.enum';
import type { TenantRole } from '../enums/tenant-role.enum';

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  globalRole: Role;
  isActive: boolean;
  isAdmin: boolean;
  activeTenantId: string | null;
  tenantRole: TenantRole | null;
}
