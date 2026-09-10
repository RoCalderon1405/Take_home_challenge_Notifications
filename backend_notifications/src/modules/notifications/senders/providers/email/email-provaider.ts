import type { JsonObject, NotificationSendInput } from '../../contracts';

export interface EmailProviderResult {
  provider: string;
  providerMessageId: string;
  providerResponse?: JsonObject;
}

export interface EmailProvider {
  send(input: NotificationSendInput): Promise<EmailProviderResult>;
}
