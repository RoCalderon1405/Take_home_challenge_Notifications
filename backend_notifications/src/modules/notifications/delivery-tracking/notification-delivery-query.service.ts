import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryEventType } from '../models';
import type {
  NotificationDeliveryEventResponseDto,
  NotificationDeliveryResponseDto,
} from '../response';

/**
 * Exposes provider-independent delivery history for notification owners.
 */
@Injectable()
export class NotificationDeliveryQueryService {
  constructor(private readonly prismaService: PrismaService) {}

  async findForUser(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDeliveryResponseDto[]> {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id: ${notificationId} not found`,
      );
    }

    const deliveries = await this.prismaService.notificationDelivery.findMany({
      where: {
        notificationId,
      },
      include: {
        events: {
          orderBy: [
            {
              occurredAt: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        },
      },
      orderBy: {
        attemptNumber: 'asc',
      },
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      attemptNumber: delivery.attemptNumber,
      status: delivery.status,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      startedAt: delivery.startedAt,
      completedAt: delivery.completedAt,
      deliveredAt: delivery.deliveredAt,
      events: delivery.events.map(
        (event): NotificationDeliveryEventResponseDto => ({
          id: event.id,
          eventType: event.eventType as DeliveryEventType,
          occurredAt: event.occurredAt,
        }),
      ),
    }));
  }
}
