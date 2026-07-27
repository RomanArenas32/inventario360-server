import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  create(dto: CreateCategoryDto, tenantId: string) {
    return this.categoryRepository.create(dto, tenantId);
  }

  findAll(tenantId: string) {
    return this.categoryRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.categoryRepository.findOne(id, tenantId);
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.categoryRepository.update(id, dto);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.categoryRepository.delete(id);
  }
}
