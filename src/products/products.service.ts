import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { QueryFailedError } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { BulkImportDto } from './dto/bulk-import.dto';
import { ProductRepository } from './repositories/product.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoriesService: CategoriesService,
    private readonly notificationSettings: NotificationSettingsService,
    private readonly notifications: NotificationsService,
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

  findAll(
    tenantId: string,
    filters: {
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      stock?: 'low' | 'ok';
    } = {},
  ) {
    return this.productRepository.findAll(tenantId, filters);
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

    // Alerta de stock bajo — solo si cambió el minStock y el stock actual quedó en o bajo el nuevo mínimo
    if (dto.minStock !== undefined) {
      if (dto.minStock > 0 && updated.stock <= dto.minStock) {
        void this.notificationSettings.notifyLowStock(tenantId, updated);
        void this.notifications.create(
          tenantId,
          NotificationType.LowStock,
          'Stock bajo',
          `"${updated.name}" tiene ${updated.stock} unidades (mínimo: ${updated.minStock})`,
          { productId: updated.id },
        );
      }
    }

    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);

    try {
      await this.productRepository.delete(id);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError: unknown = error.driverError;

        if (
          typeof driverError === 'object' &&
          driverError !== null &&
          'code' in driverError &&
          driverError.code === '23503'
        ) {
          throw new ConflictException(
            'No se puede eliminar un producto con movimientos de stock. Podés marcarlo como inactivo.',
          );
        }
      }

      throw error;
    }
  }

  findByCode(code: string, tenantId: string) {
    return this.productRepository.findByCode(code, tenantId);
  }

  findLowStock(tenantId: string) {
    return this.productRepository.findLowStock(tenantId);
  }

  async bulkImport(
    dto: BulkImportDto,
    tenantId: string,
  ): Promise<{
    created: number;
    updated: number;
    errors: { code: string; name: string; error: string }[];
  }> {
    let created = 0;
    let updated = 0;
    const errors: { code: string; name: string; error: string }[] = [];

    // Resolve categories by name once
    const allCategories = await this.categoriesService.findAll(tenantId);
    const categoryByName = new Map(allCategories.map((c) => [c.name.toLowerCase().trim(), c.id]));

    for (const item of dto.products) {
      try {
        const categoryId = item.categoryName
          ? (categoryByName.get(item.categoryName.toLowerCase().trim()) ?? undefined)
          : undefined;

        const existing = await this.productRepository.findByCode(item.code, tenantId);

        if (existing) {
          await this.productRepository.update(existing.id, {
            name: item.name,
            description: item.description,
            costPrice: item.costPrice,
            salePrice: item.salePrice,
            minStock: item.minStock,
            categoryId: categoryId ?? existing.category?.id ?? undefined,
          });
          updated++;
        } else {
          await this.productRepository.create(
            {
              name: item.name,
              code: item.code,
              description: item.description,
              costPrice: item.costPrice,
              salePrice: item.salePrice,
              stock: item.stock ?? 0,
              minStock: item.minStock ?? 0,
              categoryId,
              isActive: true,
            },
            tenantId,
          );
          created++;
        }
      } catch (err: unknown) {
        errors.push({
          code: item.code,
          name: item.name,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }

    return { created, updated, errors };
  }
}
