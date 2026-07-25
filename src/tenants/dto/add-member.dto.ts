import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { TenantRole } from '../../common/enums/tenant-role.enum';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(TenantRole)
  role?: TenantRole;
}
