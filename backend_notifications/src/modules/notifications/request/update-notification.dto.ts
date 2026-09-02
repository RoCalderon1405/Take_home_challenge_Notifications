import { PartialType } from '@nestjs/mapped-types';

import { CreateNotificationDto } from './create-notification.dto';

/**
 * Data allowed when updating a notification.
 *
 * All editable notification fields are optional, while ownership and
 * delivery state remain controlled exclusively by the backend.
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
