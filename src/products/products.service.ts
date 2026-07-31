import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { CategoriesService } from '../categories/categories.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './repositories/product.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoriesService: CategoriesService,
    private readonly notificationSettings: NotificationSettingsService,
  ) {}

  async create(dto: CreateProductDto, tenantId: string) {
    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId, tenantId);
    }

    const existingProduct = await this.productRepository.findByCode(dto.code, tenantId);

    if (existingProduct) {
      throw new ConflictException('Ya existe un producto con ese código');
    }

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
    const product = await this.findOne(id, tenantId);
    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId, tenantId);
    }

    if (dto.code !== undefined && dto.code !== product.code) {
      const existingProduct = await this.productRepository.findByCode(dto.code, tenantId);

      if (existingProduct) {
        throw new ConflictException('Ya existe un producto con ese código');
      }
    }

    const updated = await this.productRepository.update(id, dto);

    // Alerta de stock bajo — solo si el stock cambió y quedó en o bajo el mínimo
    if (dto.stock !== undefined) {
      const newMinStock = dto.minStock ?? product.minStock;
      if (newMinStock > 0 && updated.stock <= newMinStock) {
        void this.notificationSettings.notifyLowStock(tenantId, updated);
      }
    }

    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.productRepository.delete(id);
  }

  findLowStock(tenantId: string) {
    return this.productRepository.findLowStock(tenantId);
  }
}
