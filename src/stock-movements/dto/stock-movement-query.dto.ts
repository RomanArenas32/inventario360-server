import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StockMovementType } from '../../common/enums/stock-movement-type.enum';

export type MovementPeriod = 'today' | 'yesterday' | 'week' | 'month';

export class StockMovementQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(['today', 'yesterday', 'week', 'month'])
  period?: MovementPeriod;
}
