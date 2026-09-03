import { PartialType } from '@nestjs/swagger';

import { CreateNotificationDto } from './create-notification.dto';

/**
 * Defines the fields that can be partially updated on a notification.
 *
 * Every property inherited from CreateNotificationDto becomes optional
 * while preserving its validation and OpenAPI metadata.
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
