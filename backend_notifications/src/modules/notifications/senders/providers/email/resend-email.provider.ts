import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { NotificationSendInput } from '../../contracts';
import type { EmailProvider, EmailProviderResult } from './email-provider';

/**
 * Sends Email notifications through Resend.
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private client?: Resend;

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationSendInput): Promise<EmailProviderResult> {
    const from = this.configService.getOrThrow<string>('EMAIL_FROM');
    const client = this.getClient();

    const { data, error } = await client.emails.send({
      from,
      to: [input.recipient],
      subject: input.title,
      text: input.content,
    });

    if (error) {
      throw new Error(`Resend failed to send email: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('Resend did not return an email identifier');
    }

    return {
      provider: 'resend',
      providerMessageId: data.id,
      providerResponse: {
        id: data.id,
      },
    };
  }

  private getClient(): Resend {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');

    this.client = new Resend(apiKey);

    return this.client;
  }
}
