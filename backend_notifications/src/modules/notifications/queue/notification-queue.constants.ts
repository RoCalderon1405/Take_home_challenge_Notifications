/**
 * Queue used to process notification deliveries asynchronously.
 */
export const NOTIFICATION_QUEUE = 'notifications';

/**
 * Jobs supported by the notification queue.
 */
export const NotificationJobName = {
  SEND: 'send-notification',
} as const;

export type NotificationJobName =
  (typeof NotificationJobName)[keyof typeof NotificationJobName];
