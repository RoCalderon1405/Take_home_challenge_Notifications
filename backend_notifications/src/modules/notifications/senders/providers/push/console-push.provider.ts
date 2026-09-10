import { Injectable, Logger } from '@nestjs/common';

import type { NotificationSendInput } from '../../contracts';
import type { PushProvider, PushProviderResult } from './push-provider';

/**
 * Local Push provider used by development and automated tests.
 */
@Injectable()
export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger(ConsolePushProvider.name);

  send(input: NotificationSendInput): Promise<PushProviderResult> {
    const { notificationId, recipient, title, content } = input;

    this.logger.log(
      `PUSH ${notificationId} -> ${recipient} | ${title} | ${content}`,
    );

    return Promise.resolve({
      provider: 'console-push',
      providerMessageId: `console-push-${notificationId}-${Date.now()}`,
      providerResponse: {
        accepted: true,
        recipient,
        title,
        contentLength: content.length,
      },
    });
  }
}
