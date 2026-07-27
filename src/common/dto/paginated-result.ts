export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GroupedResult<T> {
  data: Record<string, T[]>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
