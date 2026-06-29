import { applyDecorators } from '@nestjs/common';
import type { Role } from '../enums/role.enum';
import { Roles } from './roles.decorator';

export const RoleG = (...roles: Role[]) => applyDecorators(Roles(...roles));
