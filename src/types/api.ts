/** Envelope shapes the API uses. Features extend these with their own models. */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/** Error payload contract, mirrored by `ApiError` in `@/lib/http`. */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}
