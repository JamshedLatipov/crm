/**
 * Pagination DTOs for consistent API responses
 */

export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string; // Search query
}

export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponseDto<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponseDto<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  message?: string
): ApiResponseDto<never> {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
  };
}
