import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class PartialRefundItemDto {
  @IsUUID()
  saleItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class PartialRefundDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PartialRefundItemDto)
  items: PartialRefundItemDto[];
}
