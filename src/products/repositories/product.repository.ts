import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateProductDto } from '../dto/create-product.dto';
import type { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  create(dto: CreateProductDto, tenantId: string): Promise<Product> {
    const product = this.repo.create({ ...dto, tenantId });
    return this.repo.save(product);
  }

  findAll(
    tenantId: string,
    filters: {
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      stock?: 'low' | 'ok';
    } = {},
  ): Promise<Product[]> {
    const qb = this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.tenantId = :tenantId', { tenantId })
      .orderBy('product.name', 'ASC');

    if (filters.search) {
      qb.andWhere('(LOWER(product.name) LIKE :search OR LOWER(product.code) LIKE :search)', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }
    if (filters.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.stock === 'low') {
      qb.andWhere('product.stock <= product.minStock').andWhere('product.minStock > 0');
    } else if (filters.stock === 'ok') {
      qb.andWhere('product.stock > product.minStock OR product.minStock = 0');
    }

    return qb.getMany();
  }

  findOne(id: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id, tenantId }, relations: { category: true } });
  }

  findByCode(code: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({ where: { code, tenantId } });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.repo.update(id, dto);
    return this.repo.findOneOrFail({ where: { id }, relations: { category: true } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  findLowStock(tenantId: string): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.stock <= product.minStock')
      .andWhere('product.minStock > 0')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }
}
