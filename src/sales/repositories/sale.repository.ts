import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import { SaleQueryDto } from '../dto/sale-query.dto';
import { Sale } from '../entities/sale.entity';

export type Period = 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month';

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      const dow = now.getDay();
      start.setDate(now.getDate() - dow);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'last_week': {
      const dow = now.getDay();
      start.setDate(now.getDate() - dow - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - dow - 1);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0); // last day of previous month
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export type SalesSummary = {
  total: number;
  count: number;
  profit: number;
  avgTicket: number;
  byPaymentMethod: { cash: number; card: number; transfer: number };
};

export type TopProduct = {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
};

@Injectable()
export class SaleRepository {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
  ) {}

  async findAll(tenantId: string, query: SaleQueryDto): Promise<PaginatedResult<Sale>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const period = (query.period ?? 'today') as Period;
    const { start, end } = getPeriodRange(period);

    const qb = this.repo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoin('sale.user', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('sale.tenantId = :tenantId', { tenantId })
      .andWhere('sale.createdAt BETWEEN :start AND :end', { start, end })
      .orderBy('sale.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, limit, offset, hasMore: offset + data.length < total };
  }

  async getSummary(tenantId: string, period: Period = 'today'): Promise<SalesSummary> {
    const { start, end } = getPeriodRange(period);

    const baseWhere = 'sale.tenantId = :tenantId AND sale.createdAt BETWEEN :start AND :end AND sale.refundedAt IS NULL';
    const params = { tenantId, start, end };

    const [totals, pmRows] = await Promise.all([
      this.repo
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total), 0)', 'total')
        .addSelect('COUNT(sale.id)', 'count')
        .addSelect('COALESCE(SUM(sale.profit), 0)', 'profit')
        .addSelect('COALESCE(AVG(sale.total), 0)', 'avgTicket')
        .where(baseWhere, params)
        .getRawOne<{ total: string; count: string; profit: string; avgTicket: string }>(),

      this.repo
        .createQueryBuilder('sale')
        .select('sale.paymentMethod', 'method')
        .addSelect('COALESCE(SUM(sale.total), 0)', 'amount')
        .where(baseWhere, params)
        .groupBy('sale.paymentMethod')
        .getRawMany<{ method: string; amount: string }>(),
    ]);

    const byPaymentMethod = { cash: 0, card: 0, transfer: 0 };
    for (const row of pmRows) {
      if (row.method in byPaymentMethod) {
        (byPaymentMethod as Record<string, number>)[row.method] = parseFloat(row.amount);
      }
    }

    return {
      total: parseFloat(totals?.total ?? '0'),
      count: parseInt(totals?.count ?? '0', 10),
      profit: parseFloat(totals?.profit ?? '0'),
      avgTicket: parseFloat(totals?.avgTicket ?? '0'),
      byPaymentMethod,
    };
  }

  async getTopProducts(tenantId: string, period: Period = 'today', limit = 5): Promise<TopProduct[]> {
    const { start, end } = getPeriodRange(period);

    const rows = await this.repo
      .createQueryBuilder('sale')
      .innerJoin('sale.items', 'item')
      .innerJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(item.quantity)', 'qty')
      .addSelect('SUM(item.quantity * item.unitPrice)', 'revenue')
      .where('sale.tenantId = :tenantId', { tenantId })
      .andWhere('sale.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('sale.refundedAt IS NULL')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('qty', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; name: string; qty: string; revenue: string }>();

    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      qty: parseInt(r.qty, 10),
      revenue: parseFloat(r.revenue),
    }));
  }

  async findById(id: string, tenantId: string): Promise<Sale | null> {
    return this.repo.findOne({
      where: { id, tenantId },
      relations: { items: { product: true }, user: true },
    });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.findById(id, tenantId);
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }
}
