import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SaleQueryDto {
  @IsOptional()
  @IsEnum(['today', 'yesterday', 'week', 'last_week', 'month', 'last_month'])
  period?: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month';

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
