import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Plan } from '../../common/enums/plan.enum';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Plan)
  @IsOptional()
  plan?: Plan;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
