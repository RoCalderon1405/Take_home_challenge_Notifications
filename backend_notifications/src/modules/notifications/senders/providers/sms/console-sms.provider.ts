import { Injectable, Logger } from '@nestjs/common';

import type { NotificationSendInput } from '../../contracts';
import type { SmsProvider, SmsProviderResult } from './sms-provider';

/**
 * Local SMS provider used by development and automated tests.
 */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  send(input: NotificationSendInput): Promise<SmsProviderResult> {
    const { notificationId, recipient, title, content } = input;

    this.logger.log(
      `SMS ${notificationId} -> ${recipient} | ${title} | ${content}`,
    );

    return Promise.resolve({
      provider: 'console-sms',
      providerMessageId: `console-sms-${notificationId}-${Date.now()}`,
      providerResponse: {
        accepted: true,
        recipient,
        contentLength: content.length,
      },
    });
  }
}
