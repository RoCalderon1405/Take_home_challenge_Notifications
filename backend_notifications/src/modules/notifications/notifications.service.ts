import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationMapper } from './mappers';
import { CreateNotificationDto, UpdateNotificationDto } from './request';
import { NotificationResponseDto } from './response';
import { NotificationChannelCode } from './models';
import { PrismaErrorCode, PrismaErrorHandler } from '@app/common/database';

/**
 * Provides notification-related application operations.
 *
 * Notification ownership is always determined by the authenticated user.
 * Client input is never trusted to assign notification ownership.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly _prismaService: PrismaService) {}

  /**
   * Creates a notification owned by the authenticated user.
   *
   * The public channel code is resolved to its internal persistence ID
   * before the notification is stored.
   *
   * Newly created notifications rely on the database default PENDING status.
   *
   * @param userId Identifier of the authenticated user.
   * @param createNotificationDto Notification data supplied by the client.
   * @returns The created notification represented by its public API model.
   *
   * @throws BadRequestException When the selected notification channel
   * is unavailable or inactive.
   */
  async create(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const { channel, title, content, recipient } = createNotificationDto;

    const channelId = await this.resolveChannelId(channel);

    const notification = await this._prismaService.notification.create({
      data: {
        userId,
        channelId,
        title,
        content,
        recipient,
      },
      include: {
        channel: {
          select: {
            code: true,
          },
        },
      },
    });

    return NotificationMapper.toResponseFromPersistence(notification);
  }

  /**
   * Retrieves all notifications owned by the authenticated user.
   *
   * Ownership is enforced directly in the database query so notifications
   * belonging to other users never leave the persistence layer.
   *
   * Results are ordered from newest to oldest.
   *
   * @param userId Identifier of the authenticated user.
   * @returns Notifications owned exclusively by the authenticated user.
   */
  async findAllByUser(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this._prismaService.notification.findMany({
      where: {
        userId,
      },
      include: {
        channel: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications.map((notification) =>
      NotificationMapper.toResponseFromPersistence(notification),
    );
  }

  /**
   * Retrieves a notification owned by the authenticated user.
   *
   * Ownership is enforced directly in the persistence query. A notification
   * belonging to another user is treated exactly like a non-existing resource
   * to avoid leaking information about resources the requester cannot access.
   *
   * @param userId Identifier of the authenticated user.
   * @param notificationId Notification UUID.
   * @returns The notification owned by the authenticated user.
   * @throws NotFoundException When the notification does not exist or belongs
   * to another user.
   */
  async findOneByIdForUser(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this._prismaService.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      include: {
        channel: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id: ${notificationId} not found`,
      );
    }

    return NotificationMapper.toResponseFromPersistence(notification);
  }

  /**
   * Resolves an active notification channel by its stable application code.
   *
   * The database-generated channel ID remains an internal persistence detail.
   *
   * @param channel Stable notification channel code.
   * @returns Internal database identifier of the active channel.
   * @throws BadRequestException When the channel does not exist or is inactive.
   */
  private async resolveChannelId(
    channel: NotificationChannelCode,
  ): Promise<number> {
    const notificationChannel =
      await this._prismaService.notificationChannel.findFirst({
        where: {
          code: channel,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

    if (!notificationChannel) {
      throw new BadRequestException(
        `Notification channel ${channel} is not available`,
      );
    }

    return notificationChannel.id;
  }

  /**
   * Updates a notification owned by the authenticated user.
   *
   * Ownership is enforced directly in the update query by matching both
   * the notification ID and authenticated user ID.
   *
   * Only fields explicitly allowed by UpdateNotificationDto can reach
   * the persistence layer.
   *
   * @param userId Identifier of the authenticated user.
   * @param notificationId UUID of the notification to update.
   * @param updateNotificationDto Editable notification data.
   * @returns The updated notification.
   * @throws BadRequestException When the requested channel is unavailable.
   * @throws NotFoundException When the notification does not exist or belongs
   * to another user.
   */
  async update(
    userId: string,
    notificationId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const { channel, ...editableFields } = updateNotificationDto;

    const data = {
      ...editableFields,

      ...(channel !== undefined
        ? {
            channelId: await this.resolveChannelId(channel),
          }
        : {}),
    };

    try {
      const notification = await this._prismaService.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data,
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
      });

      return NotificationMapper.toResponseFromPersistence(notification);
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.RECORD_NOT_FOUND]: () =>
          new NotFoundException(
            `Notification with id: ${notificationId} not found`,
          ),
      });
    }
  }

  /**
   * Deletes a notification owned by the authenticated user.
   *
   * Ownership is enforced directly in the delete query by matching both
   * the notification ID and authenticated user ID.
   *
   * @param userId Identifier of the authenticated user.
   * @param notificationId UUID of the notification to delete.
   * @throws NotFoundException When the notification does not exist or belongs
   * to another user.
   */
  async remove(userId: string, notificationId: string): Promise<void> {
    try {
      await this._prismaService.notification.delete({
        where: {
          id: notificationId,
          userId,
        },
      });
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.RECORD_NOT_FOUND]: () =>
          new NotFoundException(
            `Notification with id: ${notificationId} not found`,
          ),
      });
    }
  }
}
