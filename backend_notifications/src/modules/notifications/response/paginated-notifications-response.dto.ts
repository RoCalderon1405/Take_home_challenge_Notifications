import { NotificationResponseDto } from './notification-response.dto';
import { PaginationMetaResponseDto } from './pagination-meta-response.dto';

/**
 * Paginated notification collection returned by the list endpoint.
 */
export class PaginatedNotificationsResponseDto {
  items!: NotificationResponseDto[];
  pagination!: PaginationMetaResponseDto;
}
