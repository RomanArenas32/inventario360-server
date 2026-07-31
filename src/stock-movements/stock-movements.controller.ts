import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: RequestUser) {
    return this.stockMovementsService.create(dto, user.activeTenantId!, user.id);
  }

  @Get()
  findAll(@Query() query: StockMovementQueryDto, @CurrentUser() user: RequestUser) {
    return this.stockMovementsService.findAll(user.activeTenantId!, query);
  }
}
