import type { JsonObject, NotificationSendInput } from '../../contracts';

/**
 * Normalized result returned by a Push infrastructure provider.
 */
export interface PushProviderResult {
  provider: string;
  providerMessageId: string;
  providerResponse?: JsonObject;
}

/**
 * Infrastructure contract used by the Push notification strategy.
 */
export interface PushProvider {
  readonly name: string;

  send(input: NotificationSendInput): Promise<PushProviderResult>;
}
