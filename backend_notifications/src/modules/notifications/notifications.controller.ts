import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import type { UserModel } from '../users/models';

import {
  ApiCreateNotification,
  ApiDeleteNotification,
  ApiGetNotification,
  ApiGetNotificationDeliveries,
  ApiGetNotifications,
  ApiGetNotificationsDashboard,
  ApiNotificationsController,
  ApiSendNotification,
  ApiUpdateNotification,
} from './docs/notification-swagger.decorators';
import { NotificationDeliveryQueryService } from './delivery-tracking';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  ListNotificationsQueryDto,
  UpdateNotificationDto,
} from './request';
import {
  NotificationDashboardResponseDto,
  NotificationDeliveryResponseDto,
  NotificationQueuedResponseDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from './response';
import { NotificationQueueProducer } from './queue/notification-queue.producer';

/**
 * Handles authenticated HTTP operations for notifications.
 *
 * Notification ownership is derived exclusively from the authenticated
 * user provided by Passport. Clients cannot assign notifications to
 * arbitrary users.
 */
@ApiNotificationsController()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly _notificationsService: NotificationsService,
    private readonly _notificationDeliveryQueryService: NotificationDeliveryQueryService,
    private readonly _notificationQueueProducer: NotificationQueueProducer,
  ) {}

  /**
   * Creates a notification owned by the authenticated user and immediately
   * queues its first asynchronous delivery attempt.
   *
   * @param user Authenticated application user.
   * @param createNotificationDto Notification data supplied by the client.
   * @returns The newly created notification.
   */
  @Post()
  @ApiCreateNotification()
  async create(
    @CurrentUser() user: UserModel,
    @Body()
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this._notificationsService.create(
      user.id,
      createNotificationDto,
    );

    await this._notificationQueueProducer.enqueueSend(user.id, notification.id);

    return notification;
  }

  /**
   * Retrieves a paginated, filterable and sortable notification collection
   * owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @param query Pagination, sorting, search and filter parameters.
   * @returns A page of notifications and its pagination metadata.
   */
  @Get()
  @ApiGetNotifications()
  findAll(
    @CurrentUser() user: UserModel,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this._notificationsService.findAllByUser(user.id, query);
  }

  /**
   * Retrieves dashboard metrics and the ten most recent notifications
   * owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @returns Dashboard summary and recent notifications.
   */
  @Get('dashboard')
  @ApiGetNotificationsDashboard()
  getDashboard(
    @CurrentUser() user: UserModel,
  ): Promise<NotificationDashboardResponseDto> {
    return this._notificationsService.getDashboardByUser(user.id);
  }

  /**
   * Retrieves normalized delivery attempts and event history for an owned notification.
   */
  @Get(':id/deliveries')
  @ApiGetNotificationDeliveries()
  findDeliveries(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<NotificationDeliveryResponseDto[]> {
    return this._notificationDeliveryQueryService.findForUser(user.id, id);
  }

  /**
   * Retrieves one notification owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to retrieve.
   * @returns The matching notification.
   */
  @Get(':id')
  @ApiGetNotification()
  findOne(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<NotificationResponseDto> {
    return this._notificationsService.findOneByIdForUser(user.id, id);
  }

  /**
   * Updates a notification owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to update.
   * @param updateNotificationDto Editable notification fields.
   * @returns The updated notification.
   */
  @Patch(':id')
  @ApiUpdateNotification()
  update(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body()
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this._notificationsService.update(
      user.id,
      id,
      updateNotificationDto,
    );
  }

  /**
   * Queues a notification for asynchronous delivery.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to send.
   * @returns Queue information for the accepted delivery request.
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSendNotification()
  async send(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<NotificationQueuedResponseDto> {
    await this._notificationsService.findOneByIdForUser(user.id, id);

    const jobId = await this._notificationQueueProducer.enqueueSend(
      user.id,
      id,
    );

    return {
      status: 'QUEUED',
      jobId,
    };
  }

  /**
   * Deletes a notification owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to delete.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteNotification()
  async remove(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<void> {
    await this._notificationsService.remove(user.id, id);
  }
}
