import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  create(dto: CreateProductDto, tenantId: string): Promise<Product> {
    const product = this.productsRepository.create({ ...dto, tenantId });
    return this.productsRepository.save(product);
  }

  findAll(tenantId: string): Promise<Product[]> {
    return this.productsRepository.find({
      where: { tenantId },
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, tenantId },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<Product> {
    await this.findOne(id, tenantId);
    await this.productsRepository.update(id, dto);
    return this.productsRepository.findOneOrFail({
      where: { id },
      relations: { category: true },
    });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.productsRepository.delete(id);
  }

  findLowStock(tenantId: string): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.stock <= product.minStock')
      .andWhere('product.minStock > 0')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }
}
