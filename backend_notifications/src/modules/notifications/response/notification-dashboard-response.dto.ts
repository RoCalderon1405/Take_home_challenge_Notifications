import { NotificationResponseDto } from './notification-response.dto';

/**
 * Aggregated notification counters displayed by the dashboard.
 */
export class NotificationDashboardSummaryResponseDto {
  total!: number;
  delivered!: number;
  pending!: number;
  failed!: number;
}

/**
 * Dashboard data for the authenticated user.
 */
export class NotificationDashboardResponseDto {
  summary!: NotificationDashboardSummaryResponseDto;
  recent!: NotificationResponseDto[];
}
