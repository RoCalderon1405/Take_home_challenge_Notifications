import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaErrorCode, PrismaErrorHandler } from '@app/common/database';
import { Prisma } from '@app/generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationMapper } from './mappers';
import {
  CreateNotificationDto,
  ListNotificationsQueryDto,
  NotificationSortBy,
  UpdateNotificationDto,
} from './request';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from './response';
import { NotificationChannelCode, NotificationStatus } from './models';

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
   * The HTTP application flow queues the first delivery immediately after this
   * persistence operation succeeds.
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
   * Retrieves a paginated notification collection owned by the authenticated
   * user, with optional search, channel/status filters and sorting.
   *
   * Ownership is always part of the persistence filter, so data belonging to
   * another user never leaves PostgreSQL. Offset pagination is intentionally
   * used because the frontend data grid navigates by page number.
   *
   * @param userId Identifier of the authenticated user.
   * @param query Pagination, sorting, search and filter parameters.
   * @returns Notifications and pagination metadata for the requested page.
   */
  async findAllByUser(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const { page, pageSize, sortBy, sortDirection, status, channel, search } =
      query;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(status !== undefined ? { status } : {}),
      ...(channel !== undefined
        ? {
            channel: {
              code: channel,
            },
          }
        : {}),
      ...(search !== undefined
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { recipient: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = this.buildOrderBy(sortBy, sortDirection);
    const skip = (page - 1) * pageSize;

    const [notifications, totalItems] = await this._prismaService.$transaction([
      this._prismaService.notification.findMany({
        where,
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this._prismaService.notification.count({ where }),
    ]);

    const items = notifications.map((notification) =>
      NotificationMapper.toResponseFromPersistence(notification),
    );

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    };
  }

  /**
   * Retrieves dashboard metrics and the ten most recent notifications
   * owned by the authenticated user.
   *
   * Status counts and recent notifications are fetched concurrently
   * to minimize dashboard loading time.
   *
   * @param userId Identifier of the authenticated user.
   * @returns Dashboard summary and the ten most recent notifications.
   */
  async getDashboardByUser(userId: string): Promise<{
    summary: {
      total: number;
      delivered: number;
      pending: number;
      failed: number;
    };
    recent: NotificationResponseDto[];
  }> {
    const statusCountsPromise = this._prismaService.notification.groupBy({
      by: ['status'],
      where: {
        userId,
      },
      orderBy: {
        status: 'asc',
      },
      _count: {
        _all: true,
      },
    });

    const recentNotificationsPromise =
      this._prismaService.notification.findMany({
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
        take: 10,
      });

    const [statusCounts, recentNotifications] = await Promise.all([
      statusCountsPromise,
      recentNotificationsPromise,
    ]);

    const countsByStatus = new Map(
      statusCounts.map((item) => [item.status, item._count._all]),
    );

    const total = statusCounts.reduce((sum, item) => sum + item._count._all, 0);

    return {
      summary: {
        total,
        delivered: countsByStatus.get(NotificationStatus.DELIVERED) ?? 0,
        pending: countsByStatus.get(NotificationStatus.PENDING) ?? 0,
        failed: countsByStatus.get(NotificationStatus.FAILED) ?? 0,
      },
      recent: recentNotifications.map((notification) =>
        NotificationMapper.toResponseFromPersistence(notification),
      ),
    };
  }

  private buildOrderBy(
    sortBy: ListNotificationsQueryDto['sortBy'],
    sortDirection: ListNotificationsQueryDto['sortDirection'],
  ): Prisma.NotificationOrderByWithRelationInput {
    switch (sortBy) {
      case NotificationSortBy.UPDATED_AT:
        return { updatedAt: sortDirection };
      case NotificationSortBy.TITLE:
        return { title: sortDirection };
      case NotificationSortBy.STATUS:
        return { status: sortDirection };
      case NotificationSortBy.CHANNEL:
        return { channel: { code: sortDirection } };
      case NotificationSortBy.RECIPIENT:
        return { recipient: sortDirection };
      case NotificationSortBy.CREATED_AT:
      default:
        return { createdAt: sortDirection };
    }
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
