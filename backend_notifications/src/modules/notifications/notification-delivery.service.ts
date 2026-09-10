import { Injectable, NotFoundException } from '@nestjs/common';

import {
  isPrismaKnownRequestError,
  PrismaErrorCode,
} from '@app/common/database';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationMapper } from './mappers';
import { DeliveryStatus, NotificationStatus } from './models';
import type { NotificationModel } from './models';

import type { NotificationSendResult } from './senders/contracts';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';
import { NotificationProviderError } from './senders/errors/notification-provider.error';

/**
 * Orchestrates notification delivery and persists each delivery attempt.
 */
@Injectable()
export class NotificationDeliveryService {
  private static readonly MAX_DELIVERY_CREATION_RETRIES = 3;

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

    const delivery = await this.createDeliveryAttempt(
      userId,
      notificationId,
      notificationModel,
    );

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

      const provider =
        error instanceof NotificationProviderError ? error.provider : null;

      const completedAt = new Date();

      await this._prismaService.$transaction([
        this._prismaService.notificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: {
            status: DeliveryStatus.FAILED,
            provider,
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

  /**
   * Creates a delivery attempt and marks the notification as processing.
   *
   * Both operations are executed atomically. If concurrent workers calculate
   * the same attempt number, the database unique constraint rejects one of
   * them and the operation retries with the latest attempt number.
   *
   * @param userId Notification owner identifier.
   * @param notificationId Notification identifier.
   * @param notification Application notification data.
   * @returns Identifier of the created delivery attempt.
   */
  private async createDeliveryAttempt(
    userId: string,
    notificationId: string,
    notification: NotificationModel,
  ): Promise<{ id: string }> {
    for (
      let retry = 0;
      retry < NotificationDeliveryService.MAX_DELIVERY_CREATION_RETRIES;
      retry++
    ) {
      try {
        return await this._prismaService.$transaction(async (transaction) => {
          const lastDelivery = await transaction.notificationDelivery.findFirst(
            {
              where: {
                notificationId,
              },
              orderBy: {
                attemptNumber: 'desc',
              },
              select: {
                attemptNumber: true,
              },
            },
          );

          const attemptNumber = (lastDelivery?.attemptNumber ?? 0) + 1;

          const delivery = await transaction.notificationDelivery.create({
            data: {
              notificationId,
              attemptNumber,
              status: DeliveryStatus.PROCESSING,
              requestPayload: {
                channel: notification.channel,
                recipient: notification.recipient,
                title: notification.title,
              },
            },
            select: {
              id: true,
            },
          });

          await transaction.notification.update({
            where: {
              id: notificationId,
              userId,
            },
            data: {
              status: NotificationStatus.PROCESSING,
              lastError: null,
            },
          });

          return delivery;
        });
      } catch (error: unknown) {
        const isAttemptNumberCollision =
          isPrismaKnownRequestError(error) &&
          error.code === PrismaErrorCode.UNIQUE_CONSTRAINT;

        const canRetry =
          retry < NotificationDeliveryService.MAX_DELIVERY_CREATION_RETRIES - 1;

        if (isAttemptNumberCollision && canRetry) {
          continue;
        }

        throw error;
      }
    }

    throw new Error(
      `Unable to create delivery attempt for notification ${notificationId}`,
    );
  }
}
