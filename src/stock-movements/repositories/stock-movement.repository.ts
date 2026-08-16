import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import { StockMovementQueryDto } from '../dto/stock-movement-query.dto';
import { StockMovement } from '../entities/stock-movement.entity';

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
        '(LOWER(product.name) LIKE :search OR LOWER(product.code) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
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
