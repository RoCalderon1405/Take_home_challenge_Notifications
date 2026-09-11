import type { DeliveryEventType } from '../models';

/** Provider-independent event shown in a delivery timeline. */
export class NotificationDeliveryEventResponseDto {
  id!: string;
  eventType!: DeliveryEventType;
  occurredAt!: Date;
}
