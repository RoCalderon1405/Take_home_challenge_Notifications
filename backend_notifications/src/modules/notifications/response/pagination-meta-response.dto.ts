/**
 * Metadata returned with a paginated collection.
 */
export class PaginationMetaResponseDto {
  page!: number;
  pageSize!: number;
  totalItems!: number;
  totalPages!: number;
  hasNextPage!: boolean;
  hasPreviousPage!: boolean;
}
