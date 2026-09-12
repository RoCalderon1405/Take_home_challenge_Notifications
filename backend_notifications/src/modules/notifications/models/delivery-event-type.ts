/**
 * Provider-independent delivery timeline events exposed by the API.
 *
 * Raw provider event names and payloads remain internal persistence details.
 */
export const DeliveryEventType = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  DELAYED: 'DELAYED',
  BOUNCED: 'BOUNCED',
  SUPPRESSED: 'SUPPRESSED',
  COMPLAINED: 'COMPLAINED',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  QUEUED: 'QUEUED',
  SENDING: 'SENDING',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DeliveryEventType =
  (typeof DeliveryEventType)[keyof typeof DeliveryEventType];
