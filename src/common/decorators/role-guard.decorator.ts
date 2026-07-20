import { applyDecorators } from '@nestjs/common';
import type { Role } from '../enums/role.enum';
import type { TenantRole } from '../enums/tenant-role.enum';
import { Roles } from './roles.decorator';

export const RoleG = (...roles: (Role | TenantRole)[]) => applyDecorators(Roles(...roles));
