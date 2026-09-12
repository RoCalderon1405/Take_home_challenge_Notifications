import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryEventType, DeliveryStatus } from '../models';

import { NotificationDeliveryQueryService } from './notification-delivery-query.service';

describe('NotificationDeliveryQueryService', () => {
  const prismaServiceMock = {
    notification: {
      findFirst: jest.fn(),
    },
    notificationDelivery: {
      findMany: jest.fn(),
    },
  };

  let service: NotificationDeliveryQueryService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new NotificationDeliveryQueryService(
      prismaServiceMock as unknown as PrismaService,
    );
  });

  it('should return normalized delivery history for the notification owner', async () => {
    const userId = 'user-1';
    const notificationId = 'notification-1';

    const startedAt = new Date('2026-09-10T12:00:00.000Z');
    const completedAt = new Date('2026-09-10T12:00:02.000Z');
    const deliveredAt = new Date('2026-09-10T12:00:03.000Z');

    const sentAt = new Date('2026-09-10T12:00:02.000Z');
    const deliveredEventAt = new Date('2026-09-10T12:00:03.000Z');

    prismaServiceMock.notification.findFirst.mockResolvedValue({
      id: notificationId,
    });

    prismaServiceMock.notificationDelivery.findMany.mockResolvedValue([
      {
        id: 'delivery-1',
        attemptNumber: 1,
        status: DeliveryStatus.DELIVERED,
        provider: 'resend',
        providerMessageId: 'email-message-1',
        startedAt,
        completedAt,
        deliveredAt,
        events: [
          {
            id: 'event-1',
            eventType: DeliveryEventType.SENT,
            occurredAt: sentAt,
            createdAt: sentAt,
          },
          {
            id: 'event-2',
            eventType: DeliveryEventType.DELIVERED,
            occurredAt: deliveredEventAt,
            createdAt: deliveredEventAt,
          },
        ],
      },
    ]);

    const result = await service.findForUser(userId, notificationId);

    expect(prismaServiceMock.notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    expect(
      prismaServiceMock.notificationDelivery.findMany,
    ).toHaveBeenCalledWith({
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

    expect(result).toEqual([
      {
        id: 'delivery-1',
        attemptNumber: 1,
        status: DeliveryStatus.DELIVERED,
        provider: 'resend',
        providerMessageId: 'email-message-1',
        startedAt,
        completedAt,
        deliveredAt,
        events: [
          {
            id: 'event-1',
            eventType: DeliveryEventType.SENT,
            occurredAt: sentAt,
          },
          {
            id: 'event-2',
            eventType: DeliveryEventType.DELIVERED,
            occurredAt: deliveredEventAt,
          },
        ],
      },
    ]);
  });

  it('should return an empty array when the owned notification has no deliveries', async () => {
    prismaServiceMock.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
    });

    prismaServiceMock.notificationDelivery.findMany.mockResolvedValue([]);

    const result = await service.findForUser('user-1', 'notification-1');

    expect(result).toEqual([]);
  });

  it('should throw NotFoundException when the notification does not belong to the user', async () => {
    prismaServiceMock.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.findForUser('user-2', 'notification-1'),
    ).rejects.toThrow(
      new NotFoundException('Notification with id: notification-1 not found'),
    );

    expect(
      prismaServiceMock.notificationDelivery.findMany,
    ).not.toHaveBeenCalled();
  });
});
