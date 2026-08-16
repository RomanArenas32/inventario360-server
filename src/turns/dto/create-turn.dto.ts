import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

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

  // Calendar date (YYYY-MM-DD) the turn belongs to.
  // Required for queue turns (startTime: null); derived from startTime otherwise.
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
}
