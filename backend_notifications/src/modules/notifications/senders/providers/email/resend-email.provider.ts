import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { NotificationSendInput } from '../../contracts';
import { NotificationProviderError } from '../../errors/notification-provider.error';
import type { EmailProvider, EmailProviderResult } from './email-provider';

interface ResendErrorLike {
  message: string;
  name?: string;
}

/**
 * Sends Email notifications through Resend.
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  private client?: Resend;

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationSendInput): Promise<EmailProviderResult> {
    const from = this.configService.getOrThrow<string>('EMAIL_FROM');
    const client = this.getClient();

    try {
      const { data, error } = await client.emails.send({
        from,
        to: [input.recipient],
        subject: input.title,
        text: input.content,
      });

      if (error) {
        const providerError = error as ResendErrorLike;

        throw new NotificationProviderError(
          this.name,
          `Resend failed to send email: ${providerError.message}`,
          this.isRetryableProviderError(providerError.name),
          providerError.name,
        );
      }

      if (!data?.id) {
        throw new NotificationProviderError(
          this.name,
          'Resend did not return an email identifier',
          false,
        );
      }

      return {
        provider: this.name,
        providerMessageId: data.id,
        providerResponse: {
          id: data.id,
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotificationProviderError) {
        throw error;
      }

      throw new NotificationProviderError(
        this.name,
        `Resend request failed: ${this.getErrorMessage(error)}`,
        true,
      );
    }
  }

  private getClient(): Resend {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');

    this.client = new Resend(apiKey);

    return this.client;
  }

  /**
   * Resend API/application server failures are transient. Client-side,
   * validation, authentication and rate-limit errors remain non-retryable
   * under the queue policy already used by this project.
   */
  private isRetryableProviderError(errorName: string | undefined): boolean {
    return (
      errorName === 'application_error' || errorName === 'internal_server_error'
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
