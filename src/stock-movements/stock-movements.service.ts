import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { Product } from '../products/entities/product.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockMovementRepository } from './repositories/stock-movement.repository';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly notificationSettings: NotificationSettingsService,
  ) {}

  async create(dto: CreateStockMovementDto, tenantId: string, userId: string) {
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('El motivo es obligatorio');
    }

    if (dto.type !== StockMovementType.Adjustment && dto.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser mayor que cero');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);

      const product = await productRepository.findOne({
        where: {
          id: dto.productId,
          tenantId,
          isActive: true,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      const stockBefore = product.stock;
      let stockAfter = stockBefore;

      switch (dto.type) {
        case StockMovementType.Entry:
          stockAfter = stockBefore + dto.quantity;
          break;

        case StockMovementType.Exit:
          if (dto.quantity > stockBefore) {
            throw new BadRequestException('Stock insuficiente');
          }

          stockAfter = stockBefore - dto.quantity;
          break;

        case StockMovementType.Adjustment:
          stockAfter = dto.quantity;
          break;
      }

      const shouldNotifyLowStock =
        product.minStock > 0 && stockBefore > product.minStock && stockAfter <= product.minStock;

      product.stock = stockAfter;
      await productRepository.save(product);

      const movement = await this.stockMovementRepository.save(
        {
          type: dto.type,
          quantity: dto.quantity,
          reason,
          stockBefore,
          stockAfter,
          productId: product.id,
          tenantId,
          userId,
        },
        manager,
      );

      return {
        movement,
        product,
        shouldNotifyLowStock,
      };
    });
    if (result.shouldNotifyLowStock) {
      void this.notificationSettings
        .notifyLowStock(tenantId, result.product)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Error desconocido';

          this.logger.error(`No se pudo procesar la alerta de stock bajo: ${message}`);
        });
    }
    return result.movement;
  }

  findAll(tenantId: string, query: StockMovementQueryDto) {
    return this.stockMovementRepository.findAll(tenantId, query);
  }
}
