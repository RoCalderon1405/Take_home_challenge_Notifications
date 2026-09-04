import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationMapper } from './mappers';
import type { NotificationSendResult } from './senders/contracts';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';

/**
 * Orchestrates the delivery of notifications owned by authenticated users.
 *
 * Persistence is responsible for locating the notification while the
 * dispatcher is responsible for selecting and executing the appropriate
 * delivery strategy.
 */
@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _dispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Sends a notification owned by the authenticated user.
   *
   * @param userId Identifier of the authenticated user.
   * @param notificationId Identifier of the notification to send.
   * @returns Normalized result returned by the selected sender strategy.
   * @throws NotFoundException When the notification does not exist or belongs
   * to another user.
   */
  async send(
    userId: string,
    notificationId: string,
  ): Promise<NotificationSendResult> {
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

    const notificationModel = NotificationMapper.toModel(notification);

    return this._dispatcher.send(notificationModel);
  }
}
