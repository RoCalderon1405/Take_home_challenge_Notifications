import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationMapper } from './mappers';
import { DeliveryStatus, NotificationStatus } from './models';

import type { NotificationSendResult } from './senders/contracts';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';

/**
 * Orchestrates notification delivery and persists each delivery attempt.
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
   * A delivery attempt is created before contacting the sender strategy.
   * Both the attempt and notification are updated according to the result.
   *
   * @param userId Authenticated user identifier.
   * @param notificationId Notification identifier.
   * @returns Normalized result returned by the selected sender strategy.
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

    const lastDelivery =
      await this._prismaService.notificationDelivery.findFirst({
        where: {
          notificationId,
        },
        orderBy: {
          attemptNumber: 'desc',
        },
        select: {
          attemptNumber: true,
        },
      });

    const attemptNumber = (lastDelivery?.attemptNumber ?? 0) + 1;

    const delivery = await this._prismaService.notificationDelivery.create({
      data: {
        notificationId,
        attemptNumber,

        status: DeliveryStatus.PROCESSING,

        requestPayload: {
          channel: notificationModel.channel,
          recipient: notificationModel.recipient,
          title: notificationModel.title,
        },
      },
    });

    await this._prismaService.notification.update({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: NotificationStatus.PROCESSING,
        lastError: null,
      },
    });

    try {
      const result = await this._dispatcher.send(notificationModel);

      const completedAt = new Date();

      await this._prismaService.$transaction([
        this._prismaService.notificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: {
            status: DeliveryStatus.SENT,

            provider: result.provider,

            providerResponse: {
              providerMessageId: result.providerMessageId ?? null,

              response: result.providerResponse ?? {},
            },

            errorMessage: null,
            completedAt,
          },
        }),

        this._prismaService.notification.update({
          where: {
            id: notificationId,
            userId,
          },
          data: {
            status: NotificationStatus.SENT,
            sentAt: completedAt,
            lastError: null,
          },
        }),
      ]);

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const completedAt = new Date();

      await this._prismaService.$transaction([
        this._prismaService.notificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: {
            status: DeliveryStatus.FAILED,
            errorMessage,
            completedAt,
          },
        }),

        this._prismaService.notification.update({
          where: {
            id: notificationId,
            userId,
          },
          data: {
            status: NotificationStatus.FAILED,
            lastError: errorMessage,
          },
        }),
      ]);

      throw error;
    }
  }
}
