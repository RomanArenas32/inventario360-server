import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BusinessType } from '../../common/enums/business-type.enum';

export class OnboardingDto {
  @ApiProperty({ enum: BusinessType, enumName: 'BusinessType' })
  @IsEnum(BusinessType)
  businessType: BusinessType;
}
