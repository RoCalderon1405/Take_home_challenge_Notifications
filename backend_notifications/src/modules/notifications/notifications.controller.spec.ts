import {
  DeliveryEventType,
  DeliveryStatus,
  NotificationChannelCode,
  NotificationStatus,
} from './models';

import { NotificationsService } from './notifications.service';

import type { NotificationDeliveryQueryService } from './delivery-tracking';
import type { NotificationQueueProducer } from './queue/notification-queue.producer';
import type { UserModel } from '../users/models';

/**
 * JwtAuthGuard is replaced because controller unit tests invoke the controller
 * directly and do not need Passport's authentication pipeline.
 */
jest.mock('../auth/guards', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

/**
 * NotificationQueueProducer is replaced because controller unit tests do not
 * require BullMQ or a Redis connection.
 *
 * This also prevents Jest from loading BullMQ's ESM implementation during
 * the isolated controller test.
 */
jest.mock('./queue/notification-queue.producer', () => ({
  NotificationQueueProducer: class NotificationQueueProducer {},
}));

import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsServiceMock = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    getDashboardByUser: jest.fn(),
    findOneByIdForUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const notificationDeliveryQueryServiceMock = {
    findForUser: jest.fn(),
  };

  const notificationQueueProducerMock = {
    enqueueSend: jest.fn(),
  };

  const user = {
    id: '213b0b1e-a3c7-45c1-8a3f-12d0acb218e6',
    email: 'user@example.com',
  } as UserModel;

  const notificationResponse = {
    id: '70a7ad1a-8871-4b94-afca-201e8f6f0225',
    channel: NotificationChannelCode.EMAIL,
    title: 'Test notification',
    content: 'Test content',
    recipient: 'test@example.com',
    status: NotificationStatus.PENDING,
    lastError: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new NotificationsController(
      notificationsServiceMock as unknown as NotificationsService,
      notificationDeliveryQueryServiceMock as unknown as NotificationDeliveryQueryService,
      notificationQueueProducerMock as unknown as NotificationQueueProducer,
    );
  });

  describe('create', () => {
    it('should create a notification for the authenticated user', async () => {
      const dto = {
        channel: NotificationChannelCode.EMAIL,
        title: 'Test notification',
        content: 'Test content',
        recipient: 'test@example.com',
      };

      notificationsServiceMock.create.mockResolvedValue(notificationResponse);

      const result = await controller.create(user, dto);

      expect(notificationsServiceMock.create).toHaveBeenCalledWith(
        user.id,
        dto,
      );

      expect(notificationQueueProducerMock.enqueueSend).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
      );

      expect(result).toEqual(notificationResponse);
    });
  });

  describe('findAll', () => {
    it('should return a paginated notification collection for the authenticated user', async () => {
      const query = {
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt' as const,
        sortDirection: 'desc' as const,
      };

      const paginatedResponse = {
        items: [notificationResponse],
        pagination: {
          page: 2,
          pageSize: 10,
          totalItems: 11,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      notificationsServiceMock.findAllByUser.mockResolvedValue(
        paginatedResponse,
      );

      const result = await controller.findAll(user, query);

      expect(notificationsServiceMock.findAllByUser).toHaveBeenCalledWith(
        user.id,
        query,
      );

      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard summary and recent notifications for the authenticated user', async () => {
      const dashboardResponse = {
        summary: {
          total: 25,
          delivered: 18,
          pending: 4,
          failed: 3,
        },
        recent: [notificationResponse],
      };

      notificationsServiceMock.getDashboardByUser.mockResolvedValue(
        dashboardResponse,
      );

      const dashboardController = controller as NotificationsController & {
        getDashboard: (user: UserModel) => Promise<typeof dashboardResponse>;
      };

      const result = await dashboardController.getDashboard(user);

      expect(notificationsServiceMock.getDashboardByUser).toHaveBeenCalledWith(
        user.id,
      );

      expect(result).toEqual(dashboardResponse);
    });
  });

  describe('findDeliveries', () => {
    it('should return normalized delivery history for the authenticated user', async () => {
      const occurredAt = new Date('2026-09-10T12:00:00.000Z');

      const deliveries = [
        {
          id: '1c657eb2-19d1-42da-a6a4-c6168e30b67c',
          attemptNumber: 1,
          status: DeliveryStatus.SENT,
          provider: 'resend',
          providerMessageId: 'email-message-1',
          startedAt: occurredAt,
          completedAt: occurredAt,
          deliveredAt: null,
          events: [
            {
              id: '3a703fb0-39db-42ab-b2c4-c0b54f211a62',
              eventType: DeliveryEventType.SENT,
              occurredAt,
            },
          ],
        },
      ];

      notificationDeliveryQueryServiceMock.findForUser.mockResolvedValue(
        deliveries,
      );

      const result = await controller.findDeliveries(
        user,
        notificationResponse.id,
      );

      expect(
        notificationDeliveryQueryServiceMock.findForUser,
      ).toHaveBeenCalledWith(user.id, notificationResponse.id);

      expect(result).toEqual(deliveries);
    });
  });

  describe('findOne', () => {
    it('should return an owned notification by id', async () => {
      notificationsServiceMock.findOneByIdForUser.mockResolvedValue(
        notificationResponse,
      );

      const result = await controller.findOne(user, notificationResponse.id);

      expect(notificationsServiceMock.findOneByIdForUser).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
      );

      expect(result).toEqual(notificationResponse);
    });
  });

  describe('update', () => {
    it('should update an owned notification', async () => {
      const dto = {
        title: 'Updated notification',
      };

      notificationsServiceMock.update.mockResolvedValue({
        ...notificationResponse,
        title: dto.title,
      });

      const result = await controller.update(
        user,
        notificationResponse.id,
        dto,
      );

      expect(notificationsServiceMock.update).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
        dto,
      );

      expect(result.title).toBe('Updated notification');
    });
  });

  describe('send', () => {
    it('should validate ownership and queue the notification', async () => {
      notificationsServiceMock.findOneByIdForUser.mockResolvedValue(
        notificationResponse,
      );

      notificationQueueProducerMock.enqueueSend.mockResolvedValue('3');

      const result = await controller.send(user, notificationResponse.id);

      expect(notificationsServiceMock.findOneByIdForUser).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
      );

      expect(notificationQueueProducerMock.enqueueSend).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
      );

      expect(result).toEqual({
        status: 'QUEUED',
        jobId: '3',
      });
    });
  });

  describe('remove', () => {
    it('should delete an owned notification', async () => {
      notificationsServiceMock.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove(user, notificationResponse.id),
      ).resolves.toBeUndefined();

      expect(notificationsServiceMock.remove).toHaveBeenCalledWith(
        user.id,
        notificationResponse.id,
      );
    });
  });
});
