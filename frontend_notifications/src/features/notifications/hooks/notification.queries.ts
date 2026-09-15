import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateNotificationRequest,
  ListNotificationsRequest,
  UpdateNotificationRequest,
} from "../api/notification.dto";
import { notificationApi } from "../api/notification.api";
import {
  NotificationStatus,
  type NotificationStatus as NotificationStatusType,
} from "../models/notification.model";

const terminalStatuses = new Set<NotificationStatusType>([
  NotificationStatus.DELIVERED,
  NotificationStatus.FAILED,
]);

export const notificationKeys = {
  all: ["notifications"] as const,

  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: ListNotificationsRequest) =>
    [...notificationKeys.lists(), params] as const,

  dashboard: () => [...notificationKeys.all, "dashboard"] as const,

  details: () => [...notificationKeys.all, "detail"] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,

  deliveries: (id: string) =>
    [...notificationKeys.detail(id), "deliveries"] as const,
};

export function useNotifications(params: ListNotificationsRequest) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => {
      const items = query.state.data?.items;

      return items?.some((item) => !terminalStatuses.has(item.status))
        ? 5000
        : false;
    },
  });
}

export function useNotificationsDashboard() {
  return useQuery({
    queryKey: notificationKeys.dashboard(),
    queryFn: () => notificationApi.dashboard(),
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const item = query.state.data;

      return item && !terminalStatuses.has(item.status) ? 4000 : false;
    },
  });
}

export function useNotificationDeliveries(id: string) {
  return useQuery({
    queryKey: notificationKeys.deliveries(id),
    queryFn: () => notificationApi.deliveries(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotificationRequest) =>
      notificationApi.create(payload),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.dashboard(),
        }),
      ]);
    },
  });
}

export function useUpdateNotification(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateNotificationRequest) =>
      notificationApi.update(id, payload),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.dashboard(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.detail(id),
        }),
      ]);
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationApi.remove(id),

    onSuccess: async (_data, id) => {
      queryClient.removeQueries({
        queryKey: notificationKeys.detail(id),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.dashboard(),
        }),
      ]);
    },
  });
}

export function useSendNotification(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.send(id),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.dashboard(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.detail(id),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.deliveries(id),
        }),
      ]);
    },
  });
}
