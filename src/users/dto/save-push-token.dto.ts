import { IsOptional, IsString } from 'class-validator';

export class SavePushTokenDto {
  @IsOptional()
  @IsString()
  token: string | null = null;
}
