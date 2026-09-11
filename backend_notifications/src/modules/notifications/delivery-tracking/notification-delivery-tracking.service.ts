import { Injectable, NotFoundException } from '@nestjs/common';

import {
  isPrismaKnownRequestError,
  PrismaErrorCode,
} from '@app/common/database';
import { Prisma } from '@app/generated/prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  DeliveryEventType,
  DeliveryStatus,
  NotificationStatus,
} from '../models';

export interface RecordDeliveryEventInput {
  provider: string;
  providerMessageId: string;
  providerEventId: string;
  eventType: DeliveryEventType;
  occurredAt: Date;
  payload: Prisma.InputJsonValue;
  targetStatus?: DeliveryStatus;
  errorMessage?: string | null;
}

export interface RecordDeliveryEventResult {
  duplicate: boolean;
  stateChanged: boolean;
}

const STATE_CHANGING_EVENT_TYPES: DeliveryEventType[] = [
  DeliveryEventType.SENT,
  DeliveryEventType.DELIVERED,
  DeliveryEventType.FAILED,
  DeliveryEventType.BOUNCED,
  DeliveryEventType.SUPPRESSED,
  DeliveryEventType.CANCELED,
];

/**
 * Persists normalized provider events and applies safe delivery transitions.
 *
 * External callbacks are append-oriented. A valid event is retained even when
 * it cannot change the current state because it arrived out of order or the
 * delivery already reached a terminal state.
 */
@Injectable()
export class NotificationDeliveryTrackingService {
  constructor(private readonly prismaService: PrismaService) {}

  async recordProviderEvent(
    input: RecordDeliveryEventInput,
  ): Promise<RecordDeliveryEventResult> {
    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const delivery = await transaction.notificationDelivery.findFirst({
          where: {
            provider: input.provider,
            providerMessageId: input.providerMessageId,
          },
          select: {
            id: true,
            notificationId: true,
            attemptNumber: true,
            status: true,
            deliveredAt: true,
          },
        });

        if (!delivery) {
          // Returning a non-2xx response is intentional. A provider callback can
          // race the transaction that persists providerMessageId after send().
          throw new NotFoundException(
            `Delivery for provider message ${input.providerMessageId} was not found`,
          );
        }

        await transaction.notificationDeliveryEvent.create({
          data: {
            deliveryId: delivery.id,
            provider: input.provider,
            providerEventId: input.providerEventId,
            eventType: input.eventType,
            payload: input.payload,
            occurredAt: input.occurredAt,
          },
        });

        if (!input.targetStatus) {
          return {
            duplicate: false,
            stateChanged: false,
          };
        }

        const newerStateChangingEvent =
          await transaction.notificationDeliveryEvent.findFirst({
            where: {
              deliveryId: delivery.id,
              occurredAt: {
                gt: input.occurredAt,
              },
              eventType: {
                in: STATE_CHANGING_EVENT_TYPES,
              },
            },
            select: {
              id: true,
            },
          });

        if (newerStateChangingEvent) {
          return {
            duplicate: false,
            stateChanged: false,
          };
        }

        if (!this.canTransitionDelivery(delivery.status, input.targetStatus)) {
          return {
            duplicate: false,
            stateChanged: false,
          };
        }

        const deliveryData: Prisma.NotificationDeliveryUpdateInput = {
          status: input.targetStatus,
        };

        if (input.targetStatus === DeliveryStatus.DELIVERED) {
          deliveryData.deliveredAt = delivery.deliveredAt ?? input.occurredAt;
          deliveryData.errorMessage = null;
        } else if (input.targetStatus === DeliveryStatus.FAILED) {
          deliveryData.errorMessage =
            input.errorMessage ?? 'Provider reported delivery failure';
        }

        await transaction.notificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: deliveryData,
        });

        const latestDelivery = await transaction.notificationDelivery.findFirst(
          {
            where: {
              notificationId: delivery.notificationId,
            },
            orderBy: {
              attemptNumber: 'desc',
            },
            select: {
              id: true,
            },
          },
        );

        if (latestDelivery?.id === delivery.id) {
          const notification = await transaction.notification.findUnique({
            where: {
              id: delivery.notificationId,
            },
            select: {
              status: true,
              deliveredAt: true,
            },
          });

          if (
            notification &&
            this.canTransitionNotification(
              notification.status,
              input.targetStatus,
            )
          ) {
            const notificationData: Prisma.NotificationUpdateInput = {
              status: input.targetStatus,
            };

            if (input.targetStatus === DeliveryStatus.DELIVERED) {
              notificationData.deliveredAt =
                notification.deliveredAt ?? input.occurredAt;
              notificationData.lastError = null;
            } else if (input.targetStatus === DeliveryStatus.FAILED) {
              notificationData.lastError =
                input.errorMessage ?? 'Provider reported delivery failure';
            }

            await transaction.notification.update({
              where: {
                id: delivery.notificationId,
              },
              data: notificationData,
            });
          }
        }

        return {
          duplicate: false,
          stateChanged: true,
        };
      });
    } catch (error: unknown) {
      if (
        isPrismaKnownRequestError(error) &&
        error.code === PrismaErrorCode.UNIQUE_CONSTRAINT
      ) {
        return {
          duplicate: true,
          stateChanged: false,
        };
      }

      throw error;
    }
  }

  private canTransitionDelivery(
    current: DeliveryStatus,
    target: DeliveryStatus,
  ): boolean {
    if (current === target) {
      return false;
    }

    if (
      current === DeliveryStatus.DELIVERED ||
      current === DeliveryStatus.FAILED
    ) {
      return false;
    }

    if (target === DeliveryStatus.SENT) {
      return (
        current === DeliveryStatus.PENDING ||
        current === DeliveryStatus.PROCESSING
      );
    }

    return (
      target === DeliveryStatus.DELIVERED || target === DeliveryStatus.FAILED
    );
  }

  private canTransitionNotification(
    current: NotificationStatus,
    target: DeliveryStatus,
  ): boolean {
    if (current === target) {
      return false;
    }

    if (
      current === NotificationStatus.DELIVERED ||
      current === NotificationStatus.FAILED
    ) {
      return false;
    }

    if (target === DeliveryStatus.SENT) {
      return (
        current === NotificationStatus.PENDING ||
        current === NotificationStatus.PROCESSING
      );
    }

    return (
      target === DeliveryStatus.DELIVERED || target === DeliveryStatus.FAILED
    );
  }
}
