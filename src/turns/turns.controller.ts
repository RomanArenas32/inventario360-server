import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnDto } from './dto/update-turn.dto';
import { TurnsService } from './turns.service';

@Controller('turns')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class TurnsController {
  constructor(private readonly turnsService: TurnsService) {}

  @Get()
  findByDate(@Query('date') date: string, @CurrentUser() user: RequestUser) {
    const dateKey = date ?? new Date().toISOString().split('T')[0];
    return this.turnsService.findByDate(user.activeTenantId!, dateKey);
  }

  @Get('history')
  findHistory(
    @Query('search') search = '',
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
    @CurrentUser() user: RequestUser,
  ) {
    return this.turnsService.findHistory(
      user.activeTenantId!,
      search,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.turnsService.findById(id, user.activeTenantId!);
  }

  @Post()
  create(@Body() dto: CreateTurnDto, @CurrentUser() user: RequestUser) {
    return this.turnsService.create(dto, user.activeTenantId!, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTurnDto, @CurrentUser() user: RequestUser) {
    return this.turnsService.update(id, user.activeTenantId!, dto, user.id);
  }
}
