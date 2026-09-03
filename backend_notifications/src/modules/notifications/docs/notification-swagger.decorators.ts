import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateNotificationDto, UpdateNotificationDto } from '../request';
import { NotificationResponseDto } from '../response';

const NOTIFICATION_ID_EXAMPLE = '70a7ad1a-8871-4b94-afca-201e8f6f0225';

/**
 * Documents the Notifications controller.
 *
 * Applies the Swagger tag, JWT Bearer authentication scheme and the
 * common unauthorized response shared by every notification endpoint.
 */
export function ApiNotificationsController() {
  return applyDecorators(
    ApiTags('Notifications'),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description:
        'Authentication is required or the provided access token is invalid.',
    }),
  );
}

/**
 * Documents the endpoint that creates a notification.
 */
export function ApiCreateNotification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a notification',
      description:
        'Creates a new pending notification owned by the authenticated user.',
    }),

    ApiBody({
      type: CreateNotificationDto,
      description: 'Notification data to create.',
      examples: {
        email: {
          summary: 'Email notification',
          value: {
            channel: 'EMAIL',
            title: 'Welcome',
            content: 'Welcome to the Notifications platform.',
            recipient: 'user@example.com',
          },
        },
        sms: {
          summary: 'SMS notification',
          value: {
            channel: 'SMS',
            title: 'Verification code',
            content: 'Your verification code is 458921.',
            recipient: '+5214490000000',
          },
        },
        push: {
          summary: 'Push notification',
          value: {
            channel: 'PUSH',
            title: 'New message',
            content: 'You have received a new message.',
            recipient: 'device-token-example',
          },
        },
      },
    }),

    ApiCreatedResponse({
      description: 'Notification created successfully.',
      type: NotificationResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'The request body is invalid or the selected notification channel is unavailable.',
    }),
  );
}

/**
 * Documents the endpoint that retrieves notifications belonging to the
 * authenticated user.
 */
export function ApiGetNotifications() {
  return applyDecorators(
    ApiOperation({
      summary: 'List notifications',
      description:
        'Returns all notifications owned by the authenticated user, ordered from newest to oldest.',
    }),

    ApiOkResponse({
      description: 'Notifications retrieved successfully.',
      type: NotificationResponseDto,
      isArray: true,
    }),
  );
}

/**
 * Documents the endpoint that retrieves one notification.
 */
export function ApiGetNotification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a notification',
      description:
        'Returns a notification only when it belongs to the authenticated user.',
    }),

    ApiParam({
      name: 'id',
      description: 'Notification UUID.',
      type: String,
      format: 'uuid',
      example: NOTIFICATION_ID_EXAMPLE,
    }),

    ApiOkResponse({
      description: 'Notification retrieved successfully.',
      type: NotificationResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'The notification identifier is not a valid UUID.',
    }),

    ApiNotFoundResponse({
      description:
        'The notification does not exist or does not belong to the authenticated user.',
    }),
  );
}

/**
 * Documents the endpoint that partially updates a notification.
 */
export function ApiUpdateNotification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a notification',
      description:
        'Partially updates editable fields of a notification owned by the authenticated user.',
    }),

    ApiParam({
      name: 'id',
      description: 'Notification UUID.',
      type: String,
      format: 'uuid',
      example: NOTIFICATION_ID_EXAMPLE,
    }),

    ApiBody({
      type: UpdateNotificationDto,
      description: 'Fields of the notification to update.',
      examples: {
        content: {
          summary: 'Update notification content',
          value: {
            title: 'Updated notification title',
            content: 'Updated notification content.',
          },
        },
        channel: {
          summary: 'Change notification channel',
          value: {
            channel: 'PUSH',
            recipient: 'device-token-example',
          },
        },
      },
    }),

    ApiOkResponse({
      description: 'Notification updated successfully.',
      type: NotificationResponseDto,
    }),

    ApiBadRequestResponse({
      description:
        'The UUID or request body is invalid, or the selected notification channel is unavailable.',
    }),

    ApiNotFoundResponse({
      description:
        'The notification does not exist or does not belong to the authenticated user.',
    }),
  );
}

/**
 * Documents the endpoint that deletes a notification.
 */
export function ApiDeleteNotification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a notification',
      description:
        'Deletes a notification only when it belongs to the authenticated user.',
    }),

    ApiParam({
      name: 'id',
      description: 'Notification UUID.',
      type: String,
      format: 'uuid',
      example: NOTIFICATION_ID_EXAMPLE,
    }),

    ApiNoContentResponse({
      description: 'Notification deleted successfully.',
    }),

    ApiBadRequestResponse({
      description: 'The notification identifier is not a valid UUID.',
    }),

    ApiNotFoundResponse({
      description:
        'The notification does not exist or does not belong to the authenticated user.',
    }),
  );
}
