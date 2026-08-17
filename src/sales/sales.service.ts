import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PartialRefundDto } from './dto/partial-refund.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SaleRepository, type Period } from './repositories/sale.repository';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly saleRepository: SaleRepository,
    private readonly notificationSettings: NotificationSettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateSaleDto, tenantId: string, userId: string): Promise<Sale> {
    const result = await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const saleItemRepo = manager.getRepository(SaleItem);
      const movementRepo = manager.getRepository(StockMovement);

      // Validate each item has either productId or description+unitPrice
      for (const item of dto.items) {
        const isProductItem = !!item.productId;
        const isServiceItem = !item.productId && !!item.description && item.unitPrice !== undefined;
        if (!isProductItem && !isServiceItem) {
          throw new BadRequestException('Cada ítem debe tener productId o descripción con precio');
        }
      }

      // Get next saleNumber for this tenant
      const raw = await saleRepo
        .createQueryBuilder('s')
        .select('COALESCE(MAX(s.saleNumber), 0)', 'max')
        .where('s.tenantId = :tenantId', { tenantId })
        .getRawOne<{ max: string }>();
      const saleNumber = parseInt(raw?.max ?? '0', 10) + 1;

      let total = 0;
      let profit = 0;

      type ProductItemData = {
        type: 'product';
        product: Product;
        quantity: number;
        unitPrice: number;
        costPrice: number;
      };
      type ServiceItemData = {
        type: 'service';
        description: string;
        quantity: number;
        unitPrice: number;
      };
      type ItemData = ProductItemData | ServiceItemData;

      const itemsData: ItemData[] = [];

      for (const item of dto.items) {
        if (item.productId) {
          const product = await productRepo.findOne({
            where: { id: item.productId, tenantId, isActive: true },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) throw new NotFoundException(`Producto no encontrado: ${item.productId}`);
          if (product.stock < item.quantity) {
            throw new BadRequestException(`Stock insuficiente para "${product.name}"`);
          }
          const unitPrice = Number(product.salePrice);
          const costPrice = Number(product.costPrice);
          itemsData.push({
            type: 'product',
            product,
            quantity: item.quantity,
            unitPrice,
            costPrice,
          });
          total += unitPrice * item.quantity;
          profit += (unitPrice - costPrice) * item.quantity;
        } else {
          // Service item — no stock, full price is profit
          const unitPrice = item.unitPrice ?? 0;
          itemsData.push({
            type: 'service',
            description: item.description!,
            quantity: item.quantity,
            unitPrice,
          });
          total += unitPrice * item.quantity;
          profit += unitPrice * item.quantity;
        }
      }

      // Apply discount
      const discountPct = dto.discountPct ?? 0;
      const discountAmount = discountPct > 0 ? Math.round(total * discountPct) / 100 : 0;
      const finalTotal = Math.max(0, total - discountAmount);
      const finalProfit = discountPct > 0 ? profit * (1 - discountPct / 100) : profit;

      // Create sale
      const sale = saleRepo.create({
        total: finalTotal,
        profit: finalProfit,
        discount: discountAmount,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes ?? undefined,
        itemCount: dto.items.length,
        saleNumber,
        tenantId,
        userId,
        ...(dto.customDate ? { createdAt: new Date(dto.customDate) } : {}),
      });
      await saleRepo.save(sale);

      // Create items; update stock and create movement only for product items
      for (const itemData of itemsData) {
        if (itemData.type === 'product') {
          const { product, quantity, unitPrice, costPrice } = itemData;
          await saleItemRepo.save(
            saleItemRepo.create({
              saleId: sale.id,
              productId: product.id,
              description: null,
              quantity,
              unitPrice,
              costPrice,
            }),
          );

          const stockBefore = product.stock;
          const stockAfter = stockBefore - quantity;
          await productRepo.update(product.id, { stock: stockAfter });
          await movementRepo.save(
            movementRepo.create({
              type: StockMovementType.Exit,
              quantity,
              reason: 'Venta',
              stockBefore,
              stockAfter,
              productId: product.id,
              tenantId,
              userId,
            }),
          );
        } else {
          const { description, quantity, unitPrice } = itemData;
          await saleItemRepo.save(
            saleItemRepo.create({
              saleId: sale.id,
              productId: null,
              description,
              quantity,
              unitPrice,
              costPrice: 0,
            }),
          );
        }
      }

      return saleRepo.findOneOrFail({
        where: { id: sale.id },
        relations: { items: { product: true }, user: true },
      });
    });

    void this.fireNewSaleNotification(tenantId, userId, result);

    return result;
  }

  private async fireNewSaleNotification(
    tenantId: string,
    userId: string,
    sale: Sale,
  ): Promise<void> {
    try {
      const settings = await this.notificationSettings.getSettings(tenantId);
      if (!settings?.alertNewSale) return;
      const total = `$${Math.round(Number(sale.total)).toLocaleString('es-AR')}`;
      const title = 'Nueva venta registrada';
      const body = `${total} · ${sale.itemCount} ítem${sale.itemCount !== 1 ? 's' : ''}`;
      void this.notifications
        .create(tenantId, NotificationType.NewSale, title, body, { saleId: sale.id })
        .catch((err: unknown) => this.logger.error(`create sale notification: ${String(err)}`));
      void this.notifications
        .sendPushToTenantExcept(tenantId, userId, title, body, { saleId: sale.id })
        .catch((err: unknown) => this.logger.error(`push new sale: ${String(err)}`));
    } catch (err) {
      this.logger.error(`fireNewSaleNotification: ${String(err)}`);
    }
  }

  findAll(tenantId: string, query: SaleQueryDto) {
    return this.saleRepository.findAll(tenantId, query);
  }

  getSummary(tenantId: string, period: Period = 'today') {
    return this.saleRepository.getSummary(tenantId, period);
  }

  getTopProducts(tenantId: string, period: Period = 'today', limit = 5) {
    return this.saleRepository.getTopProducts(tenantId, period, limit);
  }

  getSummaryForMonth(tenantId: string, year: number, month: number) {
    return this.saleRepository.getSummaryForMonth(tenantId, year, month);
  }

  getMonthlyChart(tenantId: string, year: number) {
    return this.saleRepository.getMonthlyChart(tenantId, year);
  }

  findById(id: string, tenantId: string) {
    return this.saleRepository.findByIdOrFail(id, tenantId);
  }

  async partialRefund(
    saleId: string,
    tenantId: string,
    userId: string,
    dto: PartialRefundDto,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findByIdOrFail(saleId, tenantId);
    if (sale.refundedAt)
      throw new BadRequestException('Esta venta ya fue reembolsada completamente');

    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleItemRepo = manager.getRepository(SaleItem);
      const movementRepo = manager.getRepository(StockMovement);

      for (const refundItem of dto.items) {
        const item = sale.items.find((i) => i.id === refundItem.saleItemId);
        if (!item) throw new NotFoundException(`Item no encontrado: ${refundItem.saleItemId}`);

        // Service items have no stock to restore
        if (!item.productId) continue;

        const alreadyRefunded = item.refundedQuantity ?? 0;
        const available = item.quantity - alreadyRefunded;
        if (refundItem.quantity > available) {
          throw new BadRequestException(
            `Solo podés devolver ${available} unidad(es) de "${item.product?.name ?? item.description ?? 'ítem'}"`,
          );
        }

        const product = await productRepo.findOne({
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) continue;

        const stockBefore = product.stock;
        const stockAfter = stockBefore + refundItem.quantity;
        await productRepo.update(product.id, { stock: stockAfter });

        await saleItemRepo.update(item.id, {
          refundedQuantity: alreadyRefunded + refundItem.quantity,
        });

        await movementRepo.save(
          movementRepo.create({
            type: StockMovementType.Entry,
            quantity: refundItem.quantity,
            reason: 'Devolución parcial',
            stockBefore,
            stockAfter,
            productId: product.id,
            tenantId,
            userId,
          }),
        );
      }

      return this.saleRepository.findByIdOrFail(saleId, tenantId);
    });
  }

  async refund(saleId: string, tenantId: string, userId: string): Promise<Sale> {
    const sale = await this.saleRepository.findByIdOrFail(saleId, tenantId);
    if (sale.refundedAt) throw new BadRequestException('Esta venta ya fue reembolsada');

    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const movementRepo = manager.getRepository(StockMovement);

      for (const item of sale.items) {
        if (!item.productId) continue; // service items have no stock
        const product = await productRepo.findOne({
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) continue;

        const stockBefore = product.stock;
        const stockAfter = stockBefore + item.quantity;
        await productRepo.update(product.id, { stock: stockAfter });

        const movement = movementRepo.create({
          type: StockMovementType.Entry,
          quantity: item.quantity,
          reason: 'Devolución',
          stockBefore,
          stockAfter,
          productId: product.id,
          tenantId,
          userId,
        });
        await movementRepo.save(movement);
      }

      await saleRepo.update(saleId, { refundedAt: new Date() });

      return saleRepo.findOneOrFail({
        where: { id: saleId },
        relations: { items: { product: true }, user: true },
      });
    });
  }
}
