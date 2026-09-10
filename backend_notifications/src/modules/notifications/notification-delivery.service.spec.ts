import { NotFoundException } from '@nestjs/common';

import { PrismaErrorCode } from '@app/common/database';
import { Prisma } from '@app/generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  DeliveryStatus,
  NotificationChannelCode,
  NotificationStatus,
} from './models';

import { NotificationDeliveryService } from './notification-delivery.service';

import { NotificationDispatcherService } from './senders/notification-dispatcher.service';
import { NotificationProviderError } from './senders/errors/notification-provider.error';

describe('NotificationDeliveryService', () => {
  const userId = '65d6e602-ca87-4fc1-aac5-971f36a22aaa';

  const notificationId = '70a7ad1a-8871-4b94-afca-201e8f6f0225';

  const deliveryId = '1c657eb2-19d1-42da-a6a4-c6168e30b67c';

  const fixedDate = new Date('2026-09-08T20:00:00.000Z');

  const notification = {
    id: notificationId,
    userId,
    channelId: 3,
    title: 'Test notification',
    content: 'Test content',
    recipient: 'test@example.com',
    status: NotificationStatus.PENDING,
    lastError: null,
    sentAt: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    channel: {
      code: NotificationChannelCode.PUSH,
    },
  };

  const sendResult = {
    provider: 'console-push',
    providerMessageId: 'push-message-1',
    providerResponse: {
      accepted: true,
    },
  };

  const transactionClientMock = {
    notificationDelivery: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },

    notification: {
      update: jest.fn(),
    },
  };

  type TransactionClientMock = typeof transactionClientMock;

  type InteractiveTransactionCallback = (
    transaction: TransactionClientMock,
  ) => Promise<unknown>;

  const prismaServiceMock = {
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },

    notificationDelivery: {
      update: jest.fn(),
    },

    $transaction: jest.fn(),
  };

  const dispatcherMock = {
    send: jest.fn(),
  };

  let service: NotificationDeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    prismaServiceMock.$transaction.mockImplementation(
      async (operation: unknown): Promise<unknown> => {
        if (typeof operation === 'function') {
          const transactionCallback =
            operation as InteractiveTransactionCallback;

          return transactionCallback(transactionClientMock);
        }

        if (Array.isArray(operation)) {
          const operations = operation as Promise<unknown>[];

          return Promise.all(operations);
        }

        throw new Error('Unsupported Prisma transaction operation');
      },
    );

    service = new NotificationDeliveryService(
      prismaServiceMock as unknown as PrismaService,
      dispatcherMock as unknown as NotificationDispatcherService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throw NotFoundException when the notification does not belong to the user', async () => {
    prismaServiceMock.notification.findFirst.mockResolvedValue(null);

    await expect(service.send(userId, notificationId)).rejects.toThrow(
      NotFoundException,
    );

    expect(dispatcherMock.send).not.toHaveBeenCalled();

    expect(prismaServiceMock.$transaction).not.toHaveBeenCalled();
  });

  it('should create a delivery attempt and mark the notification as sent', async () => {
    prismaServiceMock.notification.findFirst.mockResolvedValue(notification);

    transactionClientMock.notificationDelivery.findFirst.mockResolvedValue({
      attemptNumber: 2,
    });

    transactionClientMock.notificationDelivery.create.mockResolvedValue({
      id: deliveryId,
    });

    transactionClientMock.notification.update.mockResolvedValue(notification);

    dispatcherMock.send.mockResolvedValue(sendResult);

    prismaServiceMock.notificationDelivery.update.mockResolvedValue({});

    prismaServiceMock.notification.update.mockResolvedValue({});

    const result = await service.send(userId, notificationId);

    expect(
      transactionClientMock.notificationDelivery.findFirst,
    ).toHaveBeenCalledWith({
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

    expect(
      transactionClientMock.notificationDelivery.create,
    ).toHaveBeenCalledWith({
      data: {
        notificationId,
        attemptNumber: 3,
        status: DeliveryStatus.PROCESSING,
        requestPayload: {
          channel: NotificationChannelCode.PUSH,
          recipient: 'test@example.com',
          title: 'Test notification',
        },
      },
      select: {
        id: true,
      },
    });

    expect(transactionClientMock.notification.update).toHaveBeenCalledWith({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: NotificationStatus.PROCESSING,
        lastError: null,
      },
    });

    expect(dispatcherMock.send).toHaveBeenCalledWith({
      id: notificationId,
      userId,
      channel: NotificationChannelCode.PUSH,
      title: 'Test notification',
      content: 'Test content',
      recipient: 'test@example.com',
      status: NotificationStatus.PENDING,
      lastError: null,
      sentAt: null,
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });

    expect(prismaServiceMock.notificationDelivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        status: DeliveryStatus.SENT,
        provider: 'console-push',
        providerResponse: {
          providerMessageId: 'push-message-1',
          response: {
            accepted: true,
          },
        },
        errorMessage: null,
        completedAt: fixedDate,
      },
    });

    expect(prismaServiceMock.notification.update).toHaveBeenCalledWith({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: NotificationStatus.SENT,
        sentAt: fixedDate,
        lastError: null,
      },
    });

    expect(result).toEqual(sendResult);
  });

  it('should mark the delivery and notification as failed when dispatching fails', async () => {
    const error = new NotificationProviderError(
      'twilio',
      'Provider unavailable',
      false,
    );

    prismaServiceMock.notification.findFirst.mockResolvedValue(notification);

    transactionClientMock.notificationDelivery.findFirst.mockResolvedValue(
      null,
    );

    transactionClientMock.notificationDelivery.create.mockResolvedValue({
      id: deliveryId,
    });

    transactionClientMock.notification.update.mockResolvedValue(notification);

    dispatcherMock.send.mockRejectedValue(error);

    prismaServiceMock.notificationDelivery.update.mockResolvedValue({});

    prismaServiceMock.notification.update.mockResolvedValue({});

    await expect(service.send(userId, notificationId)).rejects.toThrow(
      'Provider unavailable',
    );

    expect(
      transactionClientMock.notificationDelivery.create,
    ).toHaveBeenCalledWith({
      data: {
        notificationId,
        attemptNumber: 1,
        status: DeliveryStatus.PROCESSING,
        requestPayload: {
          channel: NotificationChannelCode.PUSH,
          recipient: 'test@example.com',
          title: 'Test notification',
        },
      },
      select: {
        id: true,
      },
    });

    expect(prismaServiceMock.notificationDelivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        status: DeliveryStatus.FAILED,
        provider: 'twilio',
        errorMessage: 'Provider unavailable',
        completedAt: fixedDate,
      },
    });

    expect(prismaServiceMock.notification.update).toHaveBeenCalledWith({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: NotificationStatus.FAILED,
        lastError: 'Provider unavailable',
      },
    });
  });

  it('should retry delivery creation when the attempt number collides', async () => {
    const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: PrismaErrorCode.UNIQUE_CONSTRAINT,
        clientVersion: '7.9.0',
      },
    );

    prismaServiceMock.notification.findFirst.mockResolvedValue(notification);

    transactionClientMock.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        attemptNumber: 4,
      })
      .mockResolvedValueOnce({
        attemptNumber: 5,
      });

    transactionClientMock.notificationDelivery.create
      .mockRejectedValueOnce(uniqueConstraintError)
      .mockResolvedValueOnce({
        id: deliveryId,
      });

    transactionClientMock.notification.update.mockResolvedValue(notification);

    dispatcherMock.send.mockResolvedValue(sendResult);

    prismaServiceMock.notificationDelivery.update.mockResolvedValue({});

    prismaServiceMock.notification.update.mockResolvedValue({});

    await service.send(userId, notificationId);

    expect(
      transactionClientMock.notificationDelivery.create,
    ).toHaveBeenNthCalledWith(1, {
      data: {
        notificationId,
        attemptNumber: 5,
        status: DeliveryStatus.PROCESSING,
        requestPayload: {
          channel: NotificationChannelCode.PUSH,
          recipient: 'test@example.com',
          title: 'Test notification',
        },
      },
      select: {
        id: true,
      },
    });

    expect(
      transactionClientMock.notificationDelivery.create,
    ).toHaveBeenNthCalledWith(2, {
      data: {
        notificationId,
        attemptNumber: 6,
        status: DeliveryStatus.PROCESSING,
        requestPayload: {
          channel: NotificationChannelCode.PUSH,
          recipient: 'test@example.com',
          title: 'Test notification',
        },
      },
      select: {
        id: true,
      },
    });

    expect(
      transactionClientMock.notificationDelivery.create,
    ).toHaveBeenCalledTimes(2);

    expect(transactionClientMock.notification.update).toHaveBeenCalledTimes(1);

    expect(dispatcherMock.send).toHaveBeenCalledTimes(1);
  });
});
