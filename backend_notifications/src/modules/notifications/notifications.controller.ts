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
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import type { UserModel } from '../users/models';

import {
  ApiCreateNotification,
  ApiDeleteNotification,
  ApiGetNotification,
  ApiGetNotifications,
  ApiNotificationsController,
  ApiUpdateNotification,
} from './docs/notification-swagger.decorators';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './request';
import { NotificationResponseDto } from './response';

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
  constructor(private readonly _notificationsService: NotificationsService) {}

  /**
   * Creates a notification owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @param createNotificationDto Notification data supplied by the client.
   * @returns The newly created notification.
   */
  @Post()
  @ApiCreateNotification()
  create(
    @CurrentUser() user: UserModel,
    @Body()
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this._notificationsService.create(user.id, createNotificationDto);
  }

  /**
   * Retrieves all notifications owned by the authenticated user.
   *
   * @param user Authenticated application user.
   * @returns Notifications owned by the authenticated user.
   */
  @Get()
  @ApiGetNotifications()
  findAll(@CurrentUser() user: UserModel): Promise<NotificationResponseDto[]> {
    return this._notificationsService.findAllByUser(user.id);
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
