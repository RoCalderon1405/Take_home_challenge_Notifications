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
    $transaction: jest.fn(),
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
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
    deliveredAt: null,
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
    it('should paginate, filter, search and sort notifications owned by the user', async () => {
      const persistedNotification = {
        id: notificationResponse.id,
      };

      prismaServiceMock.notification.findMany.mockReturnValue(
        'find-many-operation',
      );
      prismaServiceMock.notification.count.mockReturnValue('count-operation');
      prismaServiceMock.$transaction.mockResolvedValue([
        [persistedNotification],
        21,
      ]);

      const query = {
        page: 2,
        pageSize: 10,
        sortBy: 'title' as const,
        sortDirection: 'asc' as const,
        status: NotificationStatus.SENT,
        channel: NotificationChannelCode.EMAIL,
        search: 'welcome',
      };

      const result = await service.findAllByUser('user-id', query);

      const expectedWhere = {
        userId: 'user-id',
        status: NotificationStatus.SENT,
        channel: {
          code: NotificationChannelCode.EMAIL,
        },
        OR: [
          { title: { contains: 'welcome', mode: 'insensitive' } },
          { content: { contains: 'welcome', mode: 'insensitive' } },
          { recipient: { contains: 'welcome', mode: 'insensitive' } },
        ],
      };

      expect(prismaServiceMock.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
        orderBy: { title: 'asc' as const },
        skip: 10,
        take: 10,
      });

      expect(prismaServiceMock.notification.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(prismaServiceMock.$transaction).toHaveBeenCalledWith([
        'find-many-operation',
        'count-operation',
      ]);

      expect(result).toEqual({
        items: [notificationResponse],
        pagination: {
          page: 2,
          pageSize: 10,
          totalItems: 21,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('should apply defaults and return empty pagination metadata when there are no notifications', async () => {
      prismaServiceMock.notification.findMany.mockReturnValue(
        'find-many-operation',
      );
      prismaServiceMock.notification.count.mockReturnValue('count-operation');
      prismaServiceMock.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAllByUser('user-id', {
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt' as const,
        sortDirection: 'desc' as const,
      });

      expect(prismaServiceMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        include: {
          channel: {
            select: {
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('getDashboardByUser', () => {
    it('should return the summary and the 10 most recent notifications for the authenticated user', async () => {
      const persistedNotification = {
        id: notificationResponse.id,
      };

      prismaServiceMock.notification.groupBy.mockResolvedValue([
        {
          status: NotificationStatus.DELIVERED,
          _count: { _all: 18 },
        },
        {
          status: NotificationStatus.PENDING,
          _count: { _all: 4 },
        },
        {
          status: NotificationStatus.FAILED,
          _count: { _all: 3 },
        },
      ]);

      prismaServiceMock.notification.findMany.mockResolvedValue([
        persistedNotification,
      ]);

      const result = await service.getDashboardByUser('user-id');

      expect(prismaServiceMock.notification.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: {
          userId: 'user-id',
        },
        orderBy: {
          status: 'asc',
        },
        _count: {
          _all: true,
        },
      });

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
        take: 10,
      });

      expect(result).toEqual({
        summary: {
          total: 25,
          delivered: 18,
          pending: 4,
          failed: 3,
        },
        recent: [notificationResponse],
      });
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
