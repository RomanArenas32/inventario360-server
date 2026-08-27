import { IsEnum } from 'class-validator';
import { TurnStatus } from '../../common/enums/turn-status.enum';

export class UpdateTurnStatusDto {
  @IsEnum(TurnStatus)
  status: TurnStatus;
}
