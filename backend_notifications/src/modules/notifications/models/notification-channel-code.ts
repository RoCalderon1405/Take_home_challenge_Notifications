/**
 * Notification channels supported by the application.
 *
 * These values correspond to the stable channel codes stored in the
 * notification_channels catalog. Database-generated numeric IDs remain
 * an internal persistence detail.
 */
export const NotificationChannelCode = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
} as const;

export type NotificationChannelCode =
  (typeof NotificationChannelCode)[keyof typeof NotificationChannelCode];
