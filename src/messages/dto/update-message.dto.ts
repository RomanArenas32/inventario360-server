import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageStatus } from '../../common/enums/message-status.enum';

export class UpdateMessageDto {
  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsBoolean()
  @IsOptional()
  isUser?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
