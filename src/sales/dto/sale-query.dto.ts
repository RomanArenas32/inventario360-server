import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class SaleQueryDto {
  @IsOptional()
  @IsEnum(['today', 'yesterday', 'week', 'last_week', 'month', 'last_month'])
  period?: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month';

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(0)
  offset?: number;
}
