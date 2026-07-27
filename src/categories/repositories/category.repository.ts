import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const category = this.repo.create({ ...dto, tenantId });
    return this.repo.save(category);
  }

  findAll(tenantId: string): Promise<Category[]> {
    return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  findOne(id: string, tenantId: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.repo.update(id, dto);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
