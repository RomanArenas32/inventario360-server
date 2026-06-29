import { IsEnum } from 'class-validator';
import { BusinessType } from '../../common/enums/business-type.enum';

export class OnboardingDto {
  @IsEnum(BusinessType)
  businessType: BusinessType;
}
