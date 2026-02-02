import { PaginatedResponse, PaginationMeta } from '../dto/pagination.dto';

/**
 * Utility class for handling pagination
 */
export class PaginationHelper {
  /**
   * Calculate skip value for database query
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build pagination metadata
   */
  static buildMeta(total: number, page: number, limit: number): PaginationMeta {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Build paginated response
   */
  static buildResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      data,
      meta: this.buildMeta(total, page, limit),
    };
  }
}
