import type {
  NotificationDeliveryDto,
  NotificationDto,
  PaginatedNotificationsDto,
} from '../api/notification.dto';
import type {
  NotificationDeliveryModel,
  NotificationModel,
  PaginatedNotifications,
} from '../models/notification.model';

const toDate = (value: string | null): Date | null =>
  value ? new Date(value) : null;

export const notificationMapper = {
  toModel(dto: NotificationDto): NotificationModel {
    return {
      ...dto,
      sentAt: toDate(dto.sentAt),
      deliveredAt: toDate(dto.deliveredAt),
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  },

  toPage(dto: PaginatedNotificationsDto): PaginatedNotifications {
    return {
      items: dto.items.map((item) => notificationMapper.toModel(item)),
      pagination: dto.pagination,
    };
  },

  toDelivery(dto: NotificationDeliveryDto): NotificationDeliveryModel {
    return {
      ...dto,
      startedAt: new Date(dto.startedAt),
      completedAt: toDate(dto.completedAt),
      deliveredAt: toDate(dto.deliveredAt),
      events: dto.events.map((event) => ({
        ...event,
        occurredAt: new Date(event.occurredAt),
      })),
    };
  },
};
