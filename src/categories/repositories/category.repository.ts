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

  findAll(
    tenantId: string,
    filters: { search?: string; hasDescription?: boolean } = {},
  ): Promise<Category[]> {
    const qb = this.repo
      .createQueryBuilder('category')
      .where('category.tenantId = :tenantId', { tenantId })
      .orderBy('category.name', 'ASC');

    if (filters.search) {
      qb.andWhere('LOWER(category.name) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }
    if (filters.hasDescription === true) {
      qb.andWhere('category.description IS NOT NULL AND category.description != :empty', {
        empty: '',
      });
    } else if (filters.hasDescription === false) {
      qb.andWhere('(category.description IS NULL OR category.description = :empty)', {
        empty: '',
      });
    }

    return qb.getMany();
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
