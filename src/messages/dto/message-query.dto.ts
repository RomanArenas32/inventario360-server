import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MessageStatus } from '../../common/enums/message-status.enum';

export class MessageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: MessageStatus | MessageStatus[] | undefined }) => {
    if (value === undefined || value === null) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsEnum(MessageStatus, { each: true })
  status?: MessageStatus[];
}
