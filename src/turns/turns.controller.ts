import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnStatusDto } from './dto/update-turn-status.dto';
import { TurnsService } from './turns.service';

@Controller('turns')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class TurnsController {
  constructor(private readonly turnsService: TurnsService) {}

  @Get()
  findByDate(@Query('date') date: string, @CurrentUser() user: RequestUser) {
    const dateKey = date ?? new Date().toISOString().split('T')[0]!;
    return this.turnsService.findByDate(user.activeTenantId!, dateKey);
  }

  @Post()
  create(@Body() dto: CreateTurnDto, @CurrentUser() user: RequestUser) {
    return this.turnsService.create(dto, user.activeTenantId!, user.id);
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTurnStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.turnsService.updateStatus(id, user.activeTenantId!, dto);
  }
}
