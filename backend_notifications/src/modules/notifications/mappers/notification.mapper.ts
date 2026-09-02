import { Prisma } from '@app/generated/prisma/client';
import { NotificationChannelCode, NotificationModel } from '../models';
import { NotificationResponseDto } from '../response';

/**
 * Prisma representation required to build an application notification.
 *
 * The channel relation is intentionally included because the application
 * exposes the stable channel code instead of the persistence channelId.
 */
type NotificationWithChannel = Prisma.NotificationGetPayload<{
  include: {
    channel: {
      select: {
        code: true;
      };
    };
  };
}>;

/**
 * Maps notification persistence data into application and API models.
 *
 * This mapper provides an explicit boundary between Prisma persistence
 * structures and the rest of the application.
 */
export class NotificationMapper {
  /**
   * Maps a Prisma notification and its channel relation to the
   * application's NotificationModel.
   *
   * @param notification Notification returned by Prisma with its channel code.
   * @returns Application notification model.
   */
  static toModel(notification: NotificationWithChannel): NotificationModel {
    return {
      id: notification.id,
      userId: notification.userId,

      channel: notification.channel.code as NotificationChannelCode,

      title: notification.title,
      content: notification.content,
      recipient: notification.recipient,

      status: notification.status,

      lastError: notification.lastError,
      sentAt: notification.sentAt,

      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Maps an application notification model to its public API response.
   *
   * Persistence details such as userId and channelId are intentionally
   * excluded from the response.
   *
   * @param notification Application notification model.
   * @returns Public notification response.
   */
  static toResponse(notification: NotificationModel): NotificationResponseDto {
    return {
      id: notification.id,

      channel: notification.channel,

      title: notification.title,
      content: notification.content,
      recipient: notification.recipient,

      status: notification.status,

      lastError: notification.lastError,
      sentAt: notification.sentAt,

      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Maps notification persistence data directly to its public API response
   * while preserving the application model as an internal boundary.
   *
   * @param notification Notification returned by Prisma with its channel.
   * @returns Public notification response.
   */
  static toResponseFromPersistence(
    notification: NotificationWithChannel,
  ): NotificationResponseDto {
    return this.toResponse(this.toModel(notification));
  }
}
