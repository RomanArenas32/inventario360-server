import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import { StockMovementQueryDto, type MovementPeriod } from '../dto/stock-movement-query.dto';
import { StockMovement } from '../entities/stock-movement.entity';

function getPeriodRange(period: MovementPeriod): { from: Date; to: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (period === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (period === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (period === 'week') {
    const day = now.getDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1; // Mon = start
    const from = new Date(now);
    from.setDate(from.getDate() - diff);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: endOfDay(now) };
}

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repo: Repository<StockMovement>,
  ) {}

  save(data: DeepPartial<StockMovement>, manager?: EntityManager): Promise<StockMovement> {
    const repository = manager ? manager.getRepository(StockMovement) : this.repo;

    const movement = repository.create(data);
    return repository.save(movement);
  }

  async findAllRecent(tenantId: string, limit = 5): Promise<StockMovement[]> {
    return this.repo.find({
      where: { tenantId },
      relations: { product: true, user: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findAll(
    tenantId: string,
    query: StockMovementQueryDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const allowedSortFields = ['createdAt', 'type', 'quantity'];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const queryBuilder = this.repo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoin('movement.user', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('movement.tenantId = :tenantId', { tenantId });

    if (query.productId) {
      queryBuilder.andWhere('movement.productId = :productId', {
        productId: query.productId,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('movement.type = :type', { type: query.type });
    }

    if (query.search) {
      queryBuilder.andWhere(
        "(LOWER(product.name) LIKE :search OR LOWER(product.code) LIKE :search OR LOWER(COALESCE(movement.reason, '')) LIKE :search OR LOWER(user.name) LIKE :search)",
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.period) {
      const { from, to } = getPeriodRange(query.period);
      queryBuilder.andWhere('movement.createdAt BETWEEN :from AND :to', { from, to });
    }

    queryBuilder.orderBy(`movement.${sortBy}`, sortOrder).skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }
}
