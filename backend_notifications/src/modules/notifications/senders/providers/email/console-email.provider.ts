import { Injectable, Logger } from '@nestjs/common';

import type { NotificationSendInput } from '../../contracts';
import type { EmailProvider, EmailProviderResult } from './email-provider';

/**
 * Local email provider used by development and automated tests.
 *
 * It never calls an external service. The provider returns a normalized
 * success result so queue, delivery and persistence flows can be exercised
 * without external credentials or billable traffic.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console-email';

  private readonly logger = new Logger(ConsoleEmailProvider.name);

  send(input: NotificationSendInput): Promise<EmailProviderResult> {
    const { notificationId, recipient, title, content } = input;

    this.logger.log(
      `EMAIL ${notificationId} -> ${recipient} | ${title} | ${content}`,
    );

    return Promise.resolve({
      provider: this.name,
      providerMessageId: `console-email-${notificationId}-${Date.now()}`,
      providerResponse: {
        accepted: true,
        recipient,
        title,
        contentLength: content.length,
      },
    });
  }
}
