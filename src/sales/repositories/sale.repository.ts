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
    const limit = Number(query.limit) || 20;
    const offset = Number(query.offset) || 0;
    const period = query.period ?? 'today';
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

    if (query.paymentMethod) {
      qb.andWhere('sale.paymentMethod = :pm', { pm: query.paymentMethod });
    }

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        'EXISTS (SELECT 1 FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = sale.id AND LOWER(p.name) LIKE :search)',
        { search },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, limit, offset, hasMore: offset + data.length < total };
  }

  async getSummary(tenantId: string, period: Period = 'today'): Promise<SalesSummary> {
    const { start, end } = getPeriodRange(period);

    const baseWhere =
      'sale.tenantId = :tenantId AND sale.createdAt BETWEEN :start AND :end AND sale.refundedAt IS NULL';
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

  async getTopProducts(
    tenantId: string,
    period: Period = 'today',
    limit = 5,
  ): Promise<TopProduct[]> {
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

  async getSummaryForMonth(tenantId: string, year: number, month: number): Promise<SalesSummary> {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999); // day 0 = last day of prev month

    const baseWhere =
      'sale.tenantId = :tenantId AND sale.createdAt BETWEEN :start AND :end AND sale.refundedAt IS NULL';
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

  async getMonthlyChart(
    tenantId: string,
    year: number,
  ): Promise<Array<{ month: number; total: number; profit: number; count: number }>> {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const rows = await this.repo
      .createQueryBuilder('sale')
      .select('EXTRACT(MONTH FROM sale.createdAt)::int', 'month')
      .addSelect('COALESCE(SUM(sale.total), 0)', 'total')
      .addSelect('COALESCE(SUM(sale.profit), 0)', 'profit')
      .addSelect('COUNT(sale.id)', 'count')
      .where('sale.tenantId = :tenantId', { tenantId })
      .andWhere('sale.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('sale.refundedAt IS NULL')
      .groupBy('EXTRACT(MONTH FROM sale.createdAt)')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: number; total: string; profit: string; count: string }>();

    // Fill in all 12 months (months with no sales = 0)
    const byMonth: Record<number, { total: number; profit: number; count: number }> = {};
    for (const row of rows) {
      byMonth[row.month] = {
        total: parseFloat(row.total),
        profit: parseFloat(row.profit),
        count: parseInt(row.count, 10),
      };
    }

    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: byMonth[i + 1]?.total ?? 0,
      profit: byMonth[i + 1]?.profit ?? 0,
      count: byMonth[i + 1]?.count ?? 0,
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
