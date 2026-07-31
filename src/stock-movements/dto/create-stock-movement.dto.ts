import { IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { StockMovementType } from '../../common/enums/stock-movement-type.enum';

export class CreateStockMovementDto {
  @IsUUID()
  productId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
