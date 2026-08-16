import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PartialRefundDto } from './dto/partial-refund.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { SalesService } from './sales.service';
import type { Period } from './repositories/sale.repository';

@Controller('sales')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: RequestUser) {
    return this.salesService.create(dto, user.activeTenantId!, user.id);
  }

  @Get('summary')
  @RoleG(TenantRole.Owner)
  getSummary(@CurrentUser() user: RequestUser, @Query('period') period?: Period) {
    return this.salesService.getSummary(user.activeTenantId!, period ?? 'today');
  }

  @Get('top-products')
  @RoleG(TenantRole.Owner)
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

  @Get('monthly-summary')
  @RoleG(TenantRole.Owner)
  getMonthlySummary(
    @CurrentUser() user: RequestUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.salesService.getSummaryForMonth(
      user.activeTenantId!,
      year ? parseInt(year, 10) : now.getFullYear(),
      month ? parseInt(month, 10) : now.getMonth() + 1,
    );
  }

  @Get('monthly-chart')
  @RoleG(TenantRole.Owner)
  getMonthlyChart(@CurrentUser() user: RequestUser, @Query('year') year?: string) {
    const now = new Date();
    return this.salesService.getMonthlyChart(
      user.activeTenantId!,
      year ? parseInt(year, 10) : now.getFullYear(),
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
  @RoleG(TenantRole.Owner)
  refund(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.salesService.refund(id, user.activeTenantId!, user.id);
  }

  @Post(':id/partial-refund')
  @RoleG(TenantRole.Owner)
  partialRefund(
    @Param('id') id: string,
    @Body() dto: PartialRefundDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.partialRefund(id, user.activeTenantId!, user.id, dto);
  }
}
