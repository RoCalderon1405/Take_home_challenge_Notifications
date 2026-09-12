import type { JsonObject, NotificationSendInput } from '../../contracts';

/**
 * Normalized result returned by an email infrastructure provider.
 */
export interface EmailProviderResult {
  provider: string;
  providerMessageId: string;
  providerResponse?: JsonObject;
}

/**
 * Infrastructure contract used by the Email notification strategy.
 *
 * Implementations can deliver through a real vendor (for example Resend)
 * or through a local console provider without changing business orchestration.
 */
export interface EmailProvider {
  readonly name: string;

  send(input: NotificationSendInput): Promise<EmailProviderResult>;
}
