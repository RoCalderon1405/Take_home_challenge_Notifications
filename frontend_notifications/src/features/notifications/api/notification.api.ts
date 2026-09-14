import { apiClient } from '../../../core/api';
import { notificationMapper } from '../mappers/notification.mapper';
import type {
  CreateNotificationRequest,
  ListNotificationsRequest,
  NotificationDeliveryDto,
  NotificationDto,
  PaginatedNotificationsDto,
  QueuedResponseDto,
  UpdateNotificationRequest,
} from './notification.dto';

export const notificationApi = {
  async list(params: ListNotificationsRequest) {
    const response = await apiClient.get<PaginatedNotificationsDto>('/notifications', { params });
    return notificationMapper.toPage(response.data);
  },

  async get(id: string) {
    const response = await apiClient.get<NotificationDto>(`/notifications/${id}`);
    return notificationMapper.toModel(response.data);
  },

  async create(payload: CreateNotificationRequest) {
    const response = await apiClient.post<NotificationDto>('/notifications', payload);
    return notificationMapper.toModel(response.data);
  },

  async update(id: string, payload: UpdateNotificationRequest) {
    const response = await apiClient.patch<NotificationDto>(`/notifications/${id}`, payload);
    return notificationMapper.toModel(response.data);
  },

  async remove(id: string) {
    await apiClient.delete(`/notifications/${id}`);
  },

  async send(id: string) {
    const response = await apiClient.post<QueuedResponseDto>(`/notifications/${id}/send`);
    return response.data;
  },

  async deliveries(id: string) {
    const response = await apiClient.get<NotificationDeliveryDto[]>(`/notifications/${id}/deliveries`);
    return response.data.map((item) => notificationMapper.toDelivery(item));
  },
};
