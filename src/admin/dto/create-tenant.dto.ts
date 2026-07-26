import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BusinessType } from '../../common/enums/business-type.enum';
import { Plan } from '../../common/enums/plan.enum';

export class CreateTenantDto {
  // Business data
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ enum: BusinessType, enumName: 'BusinessType', required: false })
  @IsEnum(BusinessType)
  @IsOptional()
  businessType?: BusinessType;

  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Plan, enumName: 'Plan', required: false })
  @IsEnum(Plan)
  @IsOptional()
  plan?: Plan;

  // Owner contact (invitation will be sent)
  @IsEmail()
  ownerEmail: string;
}
