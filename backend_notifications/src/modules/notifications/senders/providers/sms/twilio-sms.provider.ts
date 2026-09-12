import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

import type { NotificationSendInput } from '../../contracts';
import { NotificationProviderError } from '../../errors/notification-provider.error';
import type { SmsProvider, SmsProviderResult } from './sms-provider';

interface TwilioError {
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private static readonly PROVIDER = 'twilio';

  readonly name = TwilioSmsProvider.PROVIDER;

  private client?: Twilio;

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationSendInput): Promise<SmsProviderResult> {
    const client = this.getClient();

    const from = this.configService.getOrThrow<string>('TWILIO_FROM_NUMBER');

    const publicApiBaseUrl = this.configService.getOrThrow<string>(
      'PUBLIC_API_BASE_URL',
    );

    try {
      const message = await client.messages.create({
        to: input.recipient,
        from,
        body: this.buildMessageBody(input),
        statusCallback: `${publicApiBaseUrl.replace(/\/+$/, '')}/api/webhooks/twilio/status`,
      });

      return {
        provider: this.name,
        providerMessageId: message.sid,
        providerResponse: {
          sid: message.sid,
          status: message.status,
          to: message.to,
          from: message.from,
          errorCode: message.errorCode,
        },
      };
    } catch (error: unknown) {
      const twilioError = error as TwilioError;

      const status = this.readNumber(twilioError.status);
      const providerCode = this.readProviderCode(twilioError.code);

      throw new NotificationProviderError(
        this.name,
        `Twilio failed to send SMS: ${this.getErrorMessage(error)}`,
        status !== null ? this.isRetryableStatus(status) : false,
        providerCode,
      );
    }
  }

  private getClient(): Twilio {
    if (this.client) {
      return this.client;
    }

    const accountSid =
      this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');

    const apiKeySid =
      this.configService.getOrThrow<string>('TWILIO_API_KEY_SID');

    const apiKeySecret = this.configService.getOrThrow<string>(
      'TWILIO_API_KEY_SECRET',
    );

    this.client = twilio(apiKeySid, apiKeySecret, {
      accountSid,
    });

    return this.client;
  }

  private buildMessageBody(input: NotificationSendInput): string {
    const title = input.title.trim();

    return title ? `${title}\n${input.content}` : input.content;
  }

  /**
   * Retries are limited to request timeouts and server-side failures.
   *
   * Client errors, including Twilio rate-limit responses, do not consume
   * additional BullMQ attempts under the current queue policy.
   */
  private isRetryableStatus(status: number): boolean {
    return status === 408 || status >= 500;
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private readProviderCode(value: unknown): string | number | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
