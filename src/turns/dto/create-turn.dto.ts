import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTurnDto {
  @IsString()
  clientName: string;

  @IsOptional()
  @IsString()
  clientPhone?: string | null;

  @IsString()
  service: string;

  @IsOptional()
  @IsISO8601()
  startTime?: string | null;

  @IsOptional()
  @IsString()
  date?: string;

  @IsInt()
  @Min(5)
  @Max(480)
  duration: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | null;
}
