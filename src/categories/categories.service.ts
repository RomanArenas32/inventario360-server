import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const category = this.categoriesRepository.create({ ...dto, tenantId });
    return this.categoriesRepository.save(category);
  }

  findAll(tenantId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id, tenantId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string): Promise<Category> {
    await this.findOne(id, tenantId);
    await this.categoriesRepository.update(id, dto);
    return this.categoriesRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.categoriesRepository.delete(id);
  }
}
