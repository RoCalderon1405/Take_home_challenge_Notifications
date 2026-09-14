import type {
  NotificationChannel,
  NotificationStatus,
} from '../models/notification.model';

export interface NotificationDto {
  id: string;
  channel: NotificationChannel;
  title: string;
  content: string;
  recipient: string;
  status: NotificationStatus;
  lastError: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetaDto {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedNotificationsDto {
  items: NotificationDto[];
  pagination: PaginationMetaDto;
}

export interface DeliveryEventDto {
  id: string;
  eventType: string;
  occurredAt: string;
}

export interface NotificationDeliveryDto {
  id: string;
  attemptNumber: number;
  status: NotificationStatus;
  provider: string | null;
  providerMessageId: string | null;
  startedAt: string;
  completedAt: string | null;
  deliveredAt: string | null;
  events: DeliveryEventDto[];
}

export interface CreateNotificationRequest {
  channel: NotificationChannel;
  title: string;
  content: string;
  recipient: string;
}

export type UpdateNotificationRequest = Partial<CreateNotificationRequest>;

export interface ListNotificationsRequest {
  page: number;
  pageSize: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status' | 'channel' | 'recipient';
  sortDirection?: 'asc' | 'desc';
  status?: NotificationStatus;
  channel?: NotificationChannel;
  search?: string;
}

export interface QueuedResponseDto {
  status: 'QUEUED';
  jobId: string;
}
