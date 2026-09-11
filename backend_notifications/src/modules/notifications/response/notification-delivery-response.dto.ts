import type { DeliveryStatus } from '../models';

import { NotificationDeliveryEventResponseDto } from './notification-delivery-event-response.dto';

/** Public delivery-attempt representation for the notification owner. */
export class NotificationDeliveryResponseDto {
  id!: string;
  attemptNumber!: number;
  status!: DeliveryStatus;
  provider!: string | null;
  providerMessageId!: string | null;
  startedAt!: Date;
  completedAt!: Date | null;
  deliveredAt!: Date | null;
  events!: NotificationDeliveryEventResponseDto[];
}
