import { IsEnum } from 'class-validator';
import { TenantRole } from '../../common/enums/tenant-role.enum';

export class UpdateMemberRoleDto {
  @IsEnum(TenantRole)
  role: TenantRole;
}
