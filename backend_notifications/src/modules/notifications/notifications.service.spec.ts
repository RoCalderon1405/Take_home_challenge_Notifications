import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaErrorCode, PrismaErrorHandler } from '@app/common/database';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationMapper } from './mappers';
import { NotificationChannelCode, NotificationStatus } from './models';
import { NotificationSortBy, SortDirection } from './request';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './response';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prismaServiceMock = {
    $transaction: jest.fn(),
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
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
        sortBy: NotificationSortBy.TITLE,
        sortDirection: SortDirection.ASC,
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
        orderBy: { title: SortDirection.ASC },
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
        sortBy: NotificationSortBy.CREATED_AT,
        sortDirection: SortDirection.DESC,
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
        orderBy: { createdAt: SortDirection.DESC },
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
