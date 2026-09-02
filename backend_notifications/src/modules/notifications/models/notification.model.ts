import { NotificationChannelCode } from './notification-channel-code';
import { NotificationStatus } from './notification-status';

/**
 * Application representation of a notification.
 *
 * Persistence-specific details such as channelId are intentionally
 * replaced by the stable channel code used by the application.
 */
export interface NotificationModel {
  id: string;
  userId: string;

  channel: NotificationChannelCode;

  title: string;
  content: string;
  recipient: string;

  status: NotificationStatus;

  lastError: string | null;
  sentAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
