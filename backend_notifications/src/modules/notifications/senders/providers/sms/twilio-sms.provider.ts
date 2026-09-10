import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { NotificationSendInput } from '../../contracts';
import { NotificationProviderError } from '../../errors/notification-provider.error';

import type { SmsProvider, SmsProviderResult } from './sms-provider';

interface TwilioMessagePayload {
  sid?: unknown;
  status?: unknown;
  to?: unknown;
  from?: unknown;

  code?: unknown;
  message?: unknown;

  error_code?: unknown;
  error_message?: unknown;
}

/**
 * Sends SMS notifications through Twilio's Messaging REST API.
 *
 * Outbound authentication uses a Twilio API Key SID and API Key Secret.
 * The Account SID identifies the Twilio account that owns the message.
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private static readonly PROVIDER = 'twilio';

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationSendInput): Promise<SmsProviderResult> {
    const accountSid =
      this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');

    const apiKeySid =
      this.configService.getOrThrow<string>('TWILIO_API_KEY_SID');

    const apiKeySecret = this.configService.getOrThrow<string>(
      'TWILIO_API_KEY_SECRET',
    );

    const from = this.configService.getOrThrow<string>('TWILIO_FROM_NUMBER');

    const endpoint =
      `https://api.twilio.com/2010-04-01/Accounts/` +
      `${encodeURIComponent(accountSid)}/Messages.json`;

    const body = new URLSearchParams({
      To: input.recipient,
      From: from,
      Body: this.buildMessageBody(input),
    });

    const authorization = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString(
      'base64',
    );

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body,
      });
    } catch (error: unknown) {
      throw new NotificationProviderError(
        TwilioSmsProvider.PROVIDER,
        `Twilio request failed: ${this.getErrorMessage(error)}`,
        true,
      );
    }

    let payload: TwilioMessagePayload;

    try {
      payload = (await response.json()) as TwilioMessagePayload;
    } catch {
      throw new NotificationProviderError(
        TwilioSmsProvider.PROVIDER,
        `Twilio returned an invalid response: HTTP ${response.status}`,
        this.isRetryableStatus(response.status),
        response.status,
      );
    }

    if (!response.ok) {
      const providerMessage =
        this.readString(payload.message) ??
        this.readString(payload.error_message) ??
        `HTTP ${response.status}`;

      throw new NotificationProviderError(
        TwilioSmsProvider.PROVIDER,
        `Twilio failed to send SMS: ${providerMessage}`,
        this.isRetryableStatus(response.status),
        this.readProviderCode(payload.code) ?? response.status,
      );
    }

    const sid = this.readString(payload.sid);

    if (!sid) {
      throw new NotificationProviderError(
        TwilioSmsProvider.PROVIDER,
        'Twilio did not return a message identifier',
        false,
      );
    }

    return {
      provider: TwilioSmsProvider.PROVIDER,
      providerMessageId: sid,
      providerResponse: {
        sid,
        status: this.readString(payload.status),
        to: this.readString(payload.to),
        from: this.readString(payload.from),
        errorCode: this.readNumber(payload.error_code),
      },
    };
  }

  private buildMessageBody(input: NotificationSendInput): string {
    const title = input.title.trim();

    return title ? `${title}\n${input.content}` : input.content;
  }

  /**
   * Retries are currently limited to explicit server-side failures
   * and request timeouts.
   *
   * Other 4xx responses require configuration or input changes and
   * should not consume additional BullMQ attempts.
   */
  private isRetryableStatus(status: number): boolean {
    return status === 408 || status >= 500;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
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
    return error instanceof Error ? error.message : String(error);
  }
}
