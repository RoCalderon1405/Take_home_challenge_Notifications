import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import {
  NotificationChannelCode,
  type NotificationChannelCode as NotificationChannelCodeType,
} from '../models';

/**
 * Data required to create a notification.
 *
 * Ownership and internal delivery state are controlled by the backend.
 * Clients cannot assign userId, channelId, status, sentAt or error fields.
 */
export class CreateNotificationDto {
  /**
   * Stable notification channel code.
   *
   * The backend resolves this code to the internal notification channel ID.
   */
  @IsIn(Object.values(NotificationChannelCode))
  channel!: NotificationChannelCodeType;

  /**
   * Notification title shown to the recipient.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  /**
   * Main notification content.
   */
  @IsString()
  @IsNotEmpty()
  content!: string;

  /**
   * Destination understood by the selected channel.
   *
   * Examples:
   * - EMAIL: email address
   * - SMS: phone number
   * - PUSH: device token
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  recipient!: string;
}
