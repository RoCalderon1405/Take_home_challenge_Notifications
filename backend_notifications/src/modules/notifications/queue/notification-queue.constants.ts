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

/**
 * Maximum number of total executions for a notification delivery job.
 */
export const NOTIFICATION_JOB_ATTEMPTS = 3;

/**
 * Initial delay for exponential retry backoff.
 */
export const NOTIFICATION_JOB_BACKOFF_DELAY_MS = 1_000;
