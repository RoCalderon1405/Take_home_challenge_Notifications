import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaErrorCode, PrismaErrorHandler } from '@app/common/database';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationMapper } from './mappers';
import { NotificationChannelCode, NotificationStatus } from './models';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './response';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prismaServiceMock = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notificationChannel: {
      findFirst: jest.fn(),
    },
  };

  const notificationResponse: NotificationResponseDto = {
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

    service = new NotificationsService(
      prismaServiceMock as unknown as PrismaService,
    );

    jest
      .spyOn(NotificationMapper, 'toResponseFromPersistence')
      .mockReturnValue(notificationResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a notification for the authenticated user', async () => {
      prismaServiceMock.notificationChannel.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaServiceMock.notification.create.mockResolvedValue({
        id: notificationResponse.id,
      });

      const result = await service.create('user-id', {
        channel: NotificationChannelCode.EMAIL,
        title: 'Test notification',
        content: 'Test content',
        recipient: 'test@example.com',
      });

      expect(
        prismaServiceMock.notificationChannel.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          code: NotificationChannelCode.EMAIL,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      expect(prismaServiceMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          channelId: 1,
          title: 'Test notification',
          content: 'Test content',
          recipient: 'test@example.com',
        },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
      });

      expect(result).toEqual(notificationResponse);
    });

    it('should throw BadRequestException when the channel is unavailable', async () => {
      prismaServiceMock.notificationChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-id', {
          channel: NotificationChannelCode.EMAIL,
          title: 'Test notification',
          content: 'Test content',
          recipient: 'test@example.com',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaServiceMock.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should return only notifications requested for the authenticated user', async () => {
      prismaServiceMock.notification.findMany.mockResolvedValue([
        {
          id: notificationResponse.id,
        },
      ]);

      const result = await service.findAllByUser('user-id');

      expect(prismaServiceMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
        },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual([notificationResponse]);
    });
  });

  describe('findOneByIdForUser', () => {
    it('should return a notification owned by the authenticated user', async () => {
      prismaServiceMock.notification.findFirst.mockResolvedValue({
        id: notificationResponse.id,
      });

      const result = await service.findOneByIdForUser(
        'user-id',
        notificationResponse.id,
      );

      expect(prismaServiceMock.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: notificationResponse.id,
          userId: 'user-id',
        },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
      });

      expect(result).toEqual(notificationResponse);
    });

    it('should throw NotFoundException when the notification is not found for the user', async () => {
      prismaServiceMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneByIdForUser('user-id', notificationResponse.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update editable notification fields', async () => {
      prismaServiceMock.notification.update.mockResolvedValue({
        id: notificationResponse.id,
      });

      const result = await service.update('user-id', notificationResponse.id, {
        title: 'Updated title',
      });

      expect(prismaServiceMock.notification.update).toHaveBeenCalledWith({
        where: {
          id: notificationResponse.id,
          userId: 'user-id',
        },
        data: {
          title: 'Updated title',
        },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
      });

      expect(result).toEqual(notificationResponse);
    });

    it('should resolve the channel before updating it', async () => {
      prismaServiceMock.notificationChannel.findFirst.mockResolvedValue({
        id: 3,
      });

      prismaServiceMock.notification.update.mockResolvedValue({
        id: notificationResponse.id,
      });

      await service.update('user-id', notificationResponse.id, {
        channel: NotificationChannelCode.PUSH,
      });

      expect(
        prismaServiceMock.notificationChannel.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          code: NotificationChannelCode.PUSH,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      expect(prismaServiceMock.notification.update).toHaveBeenCalledWith({
        where: {
          id: notificationResponse.id,
          userId: 'user-id',
        },
        data: {
          channelId: 3,
        },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
      });
    });

    it('should translate a missing owned notification into NotFoundException', async () => {
      prismaServiceMock.notification.update.mockRejectedValue(
        new Error('Prisma record not found'),
      );

      jest
        .spyOn(PrismaErrorHandler, 'handle')
        .mockImplementation((_error, mappings) => {
          const handler = mappings[PrismaErrorCode.RECORD_NOT_FOUND];

          if (!handler) {
            throw new Error('Expected RECORD_NOT_FOUND error mapping');
          }

          throw handler();
        });

      await expect(
        service.update('user-id', notificationResponse.id, {
          title: 'Updated title',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a notification owned by the authenticated user', async () => {
      prismaServiceMock.notification.delete.mockResolvedValue({
        id: notificationResponse.id,
      });

      await expect(
        service.remove('user-id', notificationResponse.id),
      ).resolves.toBeUndefined();

      expect(prismaServiceMock.notification.delete).toHaveBeenCalledWith({
        where: {
          id: notificationResponse.id,
          userId: 'user-id',
        },
      });
    });

    it('should translate a missing owned notification into NotFoundException', async () => {
      prismaServiceMock.notification.delete.mockRejectedValue(
        new Error('Prisma record not found'),
      );

      jest
        .spyOn(PrismaErrorHandler, 'handle')
        .mockImplementation((_error, mappings) => {
          const handler = mappings[PrismaErrorCode.RECORD_NOT_FOUND];

          if (!handler) {
            throw new Error('Expected RECORD_NOT_FOUND error mapping');
          }

          throw handler();
        });

      await expect(
        service.remove('user-id', notificationResponse.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
