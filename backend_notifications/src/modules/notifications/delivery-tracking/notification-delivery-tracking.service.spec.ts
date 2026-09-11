import { PrismaErrorCode } from '@app/common/database';
import { Prisma } from '@app/generated/prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  DeliveryEventType,
  DeliveryStatus,
  NotificationStatus,
} from '../models';

import { NotificationDeliveryTrackingService } from './notification-delivery-tracking.service';

describe('NotificationDeliveryTrackingService', () => {
  const notificationId = '70a7ad1a-8871-4b94-afca-201e8f6f0225';
  const deliveryId = '1c657eb2-19d1-42da-a6a4-c6168e30b67c';

  const occurredAt = new Date('2026-09-10T12:00:00.000Z');

  const transactionMock = {
    notificationDelivery: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },

    notificationDeliveryEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },

    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  type TransactionMock = typeof transactionMock;

  type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>;

  const prismaServiceMock = {
    $transaction: jest.fn(),
  };

  let service: NotificationDeliveryTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaServiceMock.$transaction.mockImplementation(
      async (callback: TransactionCallback): Promise<unknown> =>
        callback(transactionMock),
    );

    transactionMock.notificationDelivery.update.mockResolvedValue({});
    transactionMock.notificationDeliveryEvent.create.mockResolvedValue({});
    transactionMock.notificationDeliveryEvent.findFirst.mockResolvedValue(null);

    transactionMock.notification.findUnique.mockResolvedValue({
      status: NotificationStatus.SENT,
      deliveredAt: null,
    });

    transactionMock.notification.update.mockResolvedValue({});

    service = new NotificationDeliveryTrackingService(
      prismaServiceMock as unknown as PrismaService,
    );
  });

  it('should transition SENT delivery and notification to DELIVERED', async () => {
    transactionMock.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: deliveryId,
        notificationId,
        attemptNumber: 2,
        status: DeliveryStatus.SENT,
        deliveredAt: null,
      })
      .mockResolvedValueOnce({
        id: deliveryId,
      });

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'email-message-1',
      providerEventId: 'event-delivered-1',
      eventType: DeliveryEventType.DELIVERED,
      occurredAt,
      payload: {
        type: 'email.delivered',
      },
      targetStatus: DeliveryStatus.DELIVERED,
    });

    expect(
      transactionMock.notificationDeliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId,
        provider: 'resend',
        providerEventId: 'event-delivered-1',
        eventType: DeliveryEventType.DELIVERED,
        payload: {
          type: 'email.delivered',
        },
        occurredAt,
      },
    });

    expect(transactionMock.notificationDelivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: occurredAt,
        errorMessage: null,
      },
    });

    expect(transactionMock.notification.update).toHaveBeenCalledWith({
      where: {
        id: notificationId,
      },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: occurredAt,
        lastError: null,
      },
    });

    expect(result).toEqual({
      duplicate: false,
      stateChanged: true,
    });
  });

  it('should transition SENT delivery and notification to FAILED', async () => {
    transactionMock.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: deliveryId,
        notificationId,
        attemptNumber: 2,
        status: DeliveryStatus.SENT,
        deliveredAt: null,
      })
      .mockResolvedValueOnce({
        id: deliveryId,
      });

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'email-message-1',
      providerEventId: 'event-failed-1',
      eventType: DeliveryEventType.BOUNCED,
      occurredAt,
      payload: {
        type: 'email.bounced',
      },
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Email bounced',
    });

    expect(transactionMock.notificationDelivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        status: DeliveryStatus.FAILED,
        errorMessage: 'Email bounced',
      },
    });

    expect(transactionMock.notification.update).toHaveBeenCalledWith({
      where: {
        id: notificationId,
      },
      data: {
        status: DeliveryStatus.FAILED,
        lastError: 'Email bounced',
      },
    });

    expect(result).toEqual({
      duplicate: false,
      stateChanged: true,
    });
  });

  it('should not downgrade a DELIVERED delivery to SENT', async () => {
    transactionMock.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: deliveryId,
      notificationId,
      attemptNumber: 2,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: occurredAt,
    });

    const result = await service.recordProviderEvent({
      provider: 'twilio',
      providerMessageId: 'SM123',
      providerEventId: 'twilio:SM123:sent',
      eventType: DeliveryEventType.SENT,
      occurredAt: new Date('2026-09-10T12:01:00.000Z'),
      payload: {
        MessageStatus: 'sent',
      },
      targetStatus: DeliveryStatus.SENT,
    });

    expect(
      transactionMock.notificationDeliveryEvent.create,
    ).toHaveBeenCalledTimes(1);

    expect(transactionMock.notificationDelivery.update).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      duplicate: false,
      stateChanged: false,
    });
  });

  it('should not transition a DELIVERED delivery to FAILED', async () => {
    transactionMock.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: deliveryId,
      notificationId,
      attemptNumber: 2,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: occurredAt,
    });

    const result = await service.recordProviderEvent({
      provider: 'twilio',
      providerMessageId: 'SM123',
      providerEventId: 'twilio:SM123:failed',
      eventType: DeliveryEventType.FAILED,
      occurredAt: new Date('2026-09-10T12:02:00.000Z'),
      payload: {
        MessageStatus: 'failed',
      },
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Provider reported failure',
    });

    expect(
      transactionMock.notificationDeliveryEvent.create,
    ).toHaveBeenCalledTimes(1);

    expect(transactionMock.notificationDelivery.update).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      duplicate: false,
      stateChanged: false,
    });
  });

  it('should treat a duplicated provider event as idempotent', async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: PrismaErrorCode.UNIQUE_CONSTRAINT,
        clientVersion: '7.9.0',
      },
    );

    transactionMock.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: deliveryId,
      notificationId,
      attemptNumber: 1,
      status: DeliveryStatus.SENT,
      deliveredAt: null,
    });

    transactionMock.notificationDeliveryEvent.create.mockRejectedValueOnce(
      duplicateError,
    );

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'email-message-1',
      providerEventId: 'event-duplicate-1',
      eventType: DeliveryEventType.DELIVERED,
      occurredAt,
      payload: {
        type: 'email.delivered',
      },
      targetStatus: DeliveryStatus.DELIVERED,
    });

    expect(result).toEqual({
      duplicate: true,
      stateChanged: false,
    });

    expect(transactionMock.notificationDelivery.update).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();
  });

  it('should store an out-of-order event without changing the delivery state', async () => {
    transactionMock.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: deliveryId,
      notificationId,
      attemptNumber: 1,
      status: DeliveryStatus.SENT,
      deliveredAt: null,
    });

    transactionMock.notificationDeliveryEvent.findFirst.mockResolvedValueOnce({
      id: 'newer-event-id',
    });

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'email-message-1',
      providerEventId: 'older-event-id',
      eventType: DeliveryEventType.FAILED,
      occurredAt: new Date('2026-09-10T11:00:00.000Z'),
      payload: {
        type: 'email.failed',
      },
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Old failure',
    });

    expect(
      transactionMock.notificationDeliveryEvent.create,
    ).toHaveBeenCalledTimes(1);

    expect(
      transactionMock.notificationDeliveryEvent.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        deliveryId,
        occurredAt: {
          gt: new Date('2026-09-10T11:00:00.000Z'),
        },
        eventType: {
          in: [
            DeliveryEventType.SENT,
            DeliveryEventType.DELIVERED,
            DeliveryEventType.FAILED,
            DeliveryEventType.BOUNCED,
            DeliveryEventType.SUPPRESSED,
            DeliveryEventType.CANCELED,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    expect(transactionMock.notificationDelivery.update).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      duplicate: false,
      stateChanged: false,
    });
  });

  it('should update an old delivery attempt without changing the current notification status', async () => {
    const newerDeliveryId = '775202f7-d95c-43dd-bf25-cb83eb5b15ce';

    transactionMock.notificationDelivery.findFirst
      .mockResolvedValueOnce({
        id: deliveryId,
        notificationId,
        attemptNumber: 1,
        status: DeliveryStatus.SENT,
        deliveredAt: null,
      })
      .mockResolvedValueOnce({
        id: newerDeliveryId,
      });

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'old-email-message',
      providerEventId: 'old-attempt-delivered',
      eventType: DeliveryEventType.DELIVERED,
      occurredAt,
      payload: {
        type: 'email.delivered',
      },
      targetStatus: DeliveryStatus.DELIVERED,
    });

    expect(transactionMock.notificationDelivery.update).toHaveBeenCalledWith({
      where: {
        id: deliveryId,
      },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: occurredAt,
        errorMessage: null,
      },
    });

    expect(transactionMock.notification.findUnique).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      duplicate: false,
      stateChanged: true,
    });
  });

  it('should persist interaction events without changing transport status', async () => {
    transactionMock.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: deliveryId,
      notificationId,
      attemptNumber: 1,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: occurredAt,
    });

    const result = await service.recordProviderEvent({
      provider: 'resend',
      providerMessageId: 'email-message-1',
      providerEventId: 'event-opened-1',
      eventType: DeliveryEventType.OPENED,
      occurredAt,
      payload: {
        type: 'email.opened',
      },
    });

    expect(
      transactionMock.notificationDeliveryEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        deliveryId,
        provider: 'resend',
        providerEventId: 'event-opened-1',
        eventType: DeliveryEventType.OPENED,
        payload: {
          type: 'email.opened',
        },
        occurredAt,
      },
    });

    expect(
      transactionMock.notificationDeliveryEvent.findFirst,
    ).not.toHaveBeenCalled();

    expect(transactionMock.notificationDelivery.update).not.toHaveBeenCalled();

    expect(transactionMock.notification.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      duplicate: false,
      stateChanged: false,
    });
  });
});
