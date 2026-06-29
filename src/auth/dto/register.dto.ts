import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { BusinessType } from '../../common/enums/business-type.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
