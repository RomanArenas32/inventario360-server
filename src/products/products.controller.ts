import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.productsService.create(dto, user.activeTenantId!);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.productsService.findAll(user.activeTenantId!);
  }

  @Get('low-stock')
  findLowStock(@CurrentUser() user: RequestUser) {
    return this.productsService.findLowStock(user.activeTenantId!);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.productsService.findOne(id, user.activeTenantId!);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    return this.productsService.update(id, dto, user.activeTenantId!);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.productsService.remove(id, user.activeTenantId!);
  }
}
