import type {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import type { PaginationQueryDto } from '../dto/pagination-query.dto';
import type { GroupedResult, PaginatedResult } from '../dto/paginated-result';

export async function paginate<T extends ObjectLiteral>(
  repo: Repository<T>,
  query: PaginationQueryDto,
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {},
  defaultSortBy: keyof T & string = 'createdAt',
): Promise<PaginatedResult<T>> {
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  const sortBy = (query.sortBy ?? defaultSortBy) as keyof T;
  const sortOrder = query.sortOrder ?? 'DESC';

  const order = { [sortBy]: sortOrder } as FindOptionsOrder<T>;

  const options: FindManyOptions<T> = { where, order, take: limit, skip: offset };

  const [data, total] = await repo.findAndCount(options);

  return { data, total, limit, offset, hasMore: offset + data.length < total };
}

export async function paginateAndGroup<T extends ObjectLiteral>(
  repo: Repository<T>,
  query: PaginationQueryDto & { groupBy: string },
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {},
  defaultSortBy: keyof T & string = 'createdAt',
): Promise<GroupedResult<T>> {
  const result = await paginate(repo, query, where, defaultSortBy);

  const grouped: Record<string, T[]> = {};
  for (const item of result.data) {
    const raw = (item as Record<string, string | number | boolean | null | undefined>)[
      query.groupBy
    ];
    const key = raw != null ? String(raw) : 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return { ...result, data: grouped };
}
