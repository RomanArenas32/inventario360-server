import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { BusinessType } from '../../common/enums/business-type.enum';
import { Plan } from '../../common/enums/plan.enum';

export class CreateTenantDto {
  // Business data
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsEnum(BusinessType)
  @IsOptional()
  businessType?: BusinessType;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Plan)
  @IsOptional()
  plan?: Plan;

  // Owner user data
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(6)
  ownerPassword: string;
}
