import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: User) {
    return this.productsService.create(dto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.productsService.findAll(user.tenantId);
  }

  @Get('low-stock')
  findLowStock(@CurrentUser() user: User) {
    return this.productsService.findLowStock(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: User) {
    return this.productsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(id, user.tenantId);
  }
}
