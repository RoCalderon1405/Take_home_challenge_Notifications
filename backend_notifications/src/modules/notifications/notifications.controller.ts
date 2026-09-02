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

import { CreateNotificationDto, UpdateNotificationDto } from './request';
import { NotificationResponseDto } from './response';
import { NotificationsService } from './notifications.service';

/**
 * Handles authenticated HTTP operations for notifications.
 *
 * Notification ownership is derived exclusively from the authenticated
 * user provided by Passport. Clients cannot assign notifications to
 * arbitrary users.
 */
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly _notificationsService: NotificationsService) {}

  /**
   * Creates a notification owned by the authenticated user.
   *
   * The authenticated user's identifier is obtained from request.user
   * instead of accepting userId from client input.
   *
   * @param user Authenticated application user.
   * @param createNotificationDto Notification data supplied by the client.
   * @returns The newly created notification.
   */
  @Post()
  create(
    @CurrentUser() user: UserModel,
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this._notificationsService.create(user.id, createNotificationDto);
  }

  /**
   * Retrieves all notifications owned by the authenticated user.
   *
   * Ownership is derived from the authenticated Passport user and enforced
   * again at the persistence query level inside NotificationsService.
   *
   * @param user Authenticated application user.
   * @returns Notifications owned by the authenticated user.
   */
  @Get()
  findAll(@CurrentUser() user: UserModel): Promise<NotificationResponseDto[]> {
    return this._notificationsService.findAllByUser(user.id);
  }

  /**
   * Retrieves one notification owned by the authenticated user.
   *
   * The notification identifier is validated as a UUID before reaching
   * the service. Ownership is enforced by matching both notification ID
   * and authenticated user ID in the persistence query.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to retrieve.
   * @returns The matching notification.
   */
  @Get(':id')
  findOne(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<NotificationResponseDto> {
    return this._notificationsService.findOneByIdForUser(user.id, id);
  }

  /**
   * Updates a notification owned by the authenticated user.
   *
   * Only fields allowed by UpdateNotificationDto can be modified.
   * Ownership is enforced using the authenticated user's identifier.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to update.
   * @param updateNotificationDto Editable notification fields.
   * @returns The updated notification.
   */
  @Patch(':id')
  update(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
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
   * Ownership is derived from the authenticated user and enforced again
   * in the persistence query.
   *
   * A successful deletion returns HTTP 204 with no response body.
   *
   * @param user Authenticated application user.
   * @param id UUID of the notification to delete.
   */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @CurrentUser() user: UserModel,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this._notificationsService.remove(user.id, id);
  }
}
