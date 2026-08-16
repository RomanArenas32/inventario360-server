import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { SalesService } from './sales.service';
import type { Period } from './repositories/sale.repository';

@Controller('sales')
@RoleG(TenantRole.Owner)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: RequestUser) {
    return this.salesService.create(dto, user.activeTenantId!, user.id);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: RequestUser,
    @Query('period') period?: Period,
  ) {
    return this.salesService.getSummary(user.activeTenantId!, period ?? 'today');
  }

  @Get('top-products')
  getTopProducts(
    @CurrentUser() user: RequestUser,
    @Query('period') period?: Period,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.getTopProducts(
      user.activeTenantId!,
      period ?? 'today',
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get()
  findAll(@Query() query: SaleQueryDto, @CurrentUser() user: RequestUser) {
    return this.salesService.findAll(user.activeTenantId!, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.salesService.findById(id, user.activeTenantId!);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.salesService.refund(id, user.activeTenantId!, user.id);
  }
}
