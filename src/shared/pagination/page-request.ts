// Framework-free page request shared by repository contracts; the HTTP side is PaginationQuery.
export interface PageRequest {
  page: number;
  limit: number;
}

export const toOffset = ({ page, limit }: PageRequest): number =>
  (page - 1) * limit;
