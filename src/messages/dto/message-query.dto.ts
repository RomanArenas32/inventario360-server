import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MessageStatus } from '../../common/enums/message-status.enum';

export class MessageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}
