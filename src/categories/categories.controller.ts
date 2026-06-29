import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: User) {
    return this.categoriesService.create(dto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.categoriesService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.categoriesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: User) {
    return this.categoriesService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.categoriesService.remove(id, user.tenantId);
  }
}
