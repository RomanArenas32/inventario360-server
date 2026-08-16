import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SaleRepository, type Period } from './repositories/sale.repository';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly saleRepository: SaleRepository,
  ) {}

  async create(dto: CreateSaleDto, tenantId: string, userId: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const saleItemRepo = manager.getRepository(SaleItem);
      const movementRepo = manager.getRepository(StockMovement);

      let total = 0;
      let profit = 0;

      type ItemData = {
        product: Product;
        quantity: number;
        unitPrice: number;
        costPrice: number;
      };

      const itemsData: ItemData[] = [];

      for (const item of dto.items) {
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

        itemsData.push({ product, quantity: item.quantity, unitPrice, costPrice });
        total += unitPrice * item.quantity;
        profit += (unitPrice - costPrice) * item.quantity;
      }

      // Create sale
      const sale = saleRepo.create({
        total,
        profit,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes ?? undefined,
        itemCount: dto.items.length,
        tenantId,
        userId,
      });
      await saleRepo.save(sale);

      // Create items, update stock, create movements
      for (const { product, quantity, unitPrice, costPrice } of itemsData) {
        const saleItem = saleItemRepo.create({
          saleId: sale.id,
          productId: product.id,
          quantity,
          unitPrice,
          costPrice,
        });
        await saleItemRepo.save(saleItem);

        const stockBefore = product.stock;
        const stockAfter = stockBefore - quantity;
        await productRepo.update(product.id, { stock: stockAfter });

        const movement = movementRepo.create({
          type: StockMovementType.Exit,
          quantity,
          reason: 'Venta',
          stockBefore,
          stockAfter,
          productId: product.id,
          tenantId,
          userId,
        });
        await movementRepo.save(movement);
      }

      return saleRepo.findOneOrFail({
        where: { id: sale.id },
        relations: { items: { product: true }, user: true },
      });
    });
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

  findById(id: string, tenantId: string) {
    return this.saleRepository.findByIdOrFail(id, tenantId);
  }

  async refund(saleId: string, tenantId: string, userId: string): Promise<Sale> {
    const sale = await this.saleRepository.findByIdOrFail(saleId, tenantId);
    if (sale.refundedAt) throw new BadRequestException('Esta venta ya fue reembolsada');

    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const movementRepo = manager.getRepository(StockMovement);

      for (const item of sale.items) {
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
