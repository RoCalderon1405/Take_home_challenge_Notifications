import { NotificationChannelCode, NotificationStatus } from './models';

import { NotificationsService } from './notifications.service';

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
    findOneByIdForUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new NotificationsController(
      notificationsServiceMock as unknown as NotificationsService,
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

      expect(result).toEqual(notificationResponse);
    });
  });

  describe('findAll', () => {
    it('should return notifications for the authenticated user', async () => {
      notificationsServiceMock.findAllByUser.mockResolvedValue([
        notificationResponse,
      ]);

      const result = await controller.findAll(user);

      expect(notificationsServiceMock.findAllByUser).toHaveBeenCalledWith(
        user.id,
      );

      expect(result).toEqual([notificationResponse]);
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
    it('should queue an owned notification for asynchronous delivery', async () => {
      notificationQueueProducerMock.enqueueSend.mockResolvedValue('3');

      const result = await controller.send(user, notificationResponse.id);

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
