import type { JsonObject, NotificationSendInput } from '../../contracts';

/**
 * Normalized result returned by an SMS infrastructure provider.
 */
export interface SmsProviderResult {
  provider: string;
  providerMessageId: string;
  providerResponse?: JsonObject;
}

/**
 * Infrastructure contract used by the SMS notification strategy.
 */
export interface SmsProvider {
  readonly name: string;

  send(input: NotificationSendInput): Promise<SmsProviderResult>;
}
