import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './repositories/product.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productRepository: ProductRepository) {}

  create(dto: CreateProductDto, tenantId: string) {
    return this.productRepository.create(dto, tenantId);
  }

  findAll(tenantId: string) {
    return this.productRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.productRepository.findOne(id, tenantId);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.productRepository.update(id, dto);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.productRepository.delete(id);
  }

  findLowStock(tenantId: string) {
    return this.productRepository.findLowStock(tenantId);
  }
}
