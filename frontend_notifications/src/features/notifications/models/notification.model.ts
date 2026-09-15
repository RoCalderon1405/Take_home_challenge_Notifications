export const NotificationChannel = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  PUSH: "PUSH",
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export interface NotificationModel {
  id: string;
  channel: NotificationChannel;
  title: string;
  content: string;
  recipient: string;
  status: NotificationStatus;
  lastError: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedNotifications {
  items: NotificationModel[];
  pagination: PaginationMeta;
}

export interface DeliveryEventModel {
  id: string;
  eventType: string;
  occurredAt: Date;
}

export interface NotificationDeliveryModel {
  id: string;
  attemptNumber: number;
  status: NotificationStatus;
  provider: string | null;
  providerMessageId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  deliveredAt: Date | null;
  events: DeliveryEventModel[];
}

export interface NotificationDashboardSummary {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
}

export interface NotificationDashboard {
  summary: NotificationDashboardSummary;
  recent: NotificationModel[];
}
