import type { NotificationChannelCode } from '../../models';

/**
 * Primitive values that can safely be represented as JSON.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-compatible value independent from the persistence implementation.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/**
 * JSON-compatible object.
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface NotificationSendInput {
  notificationId: string;
  recipient: string;
  title: string;
  content: string;
}

export interface NotificationSendResult {
  provider: string;
  providerMessageId?: string;
  providerResponse?: JsonObject;
}

export interface NotificationSenderStrategy {
  readonly channel: NotificationChannelCode;

  /**
   * Selected infrastructure provider for this channel.
   *
   * Exposed before `send()` so a delivery attempt can record the provider
   * even when the external call fails.
   */
  readonly providerName: string;

  send(input: NotificationSendInput): Promise<NotificationSendResult>;
}
