import { NotificationChannelCode, NotificationStatus } from '../models';

/**
 * Public representation of a notification returned by the API.
 *
 * Ownership is determined from the authenticated user, so internal
 * ownership and persistence identifiers are not exposed unnecessarily.
 */
export class NotificationResponseDto {
  id!: string;

  channel!: NotificationChannelCode;

  title!: string;
  content!: string;
  recipient!: string;

  status!: NotificationStatus;

  lastError!: string | null;
  sentAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}
