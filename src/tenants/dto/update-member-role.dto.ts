import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantRole } from '../../common/enums/tenant-role.enum';

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(TenantRole)
  role?: TenantRole;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
