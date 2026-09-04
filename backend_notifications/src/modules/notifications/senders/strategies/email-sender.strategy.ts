import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';

/**
 * Delivers notifications through the Email channel.
 *
 * This implementation currently simulates a provider response.
 * A real email provider can replace the internal delivery logic later
 * without changing the notification orchestration layer.
 */
@Injectable()
export class EmailSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.EMAIL;

  private readonly logger = new Logger(EmailSenderStrategy.name);

  /**
   * Sends a notification through the Email channel.
   *
   * @param input Normalized notification data required for delivery.
   * @returns Normalized provider delivery information.
   */
  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    const { notificationId, recipient, title, content } = input;

    this.logger.log(
      `Sending EMAIL notification ${notificationId} to ${recipient}`,
    );

    const providerMessageId = `email-${notificationId}-${Date.now()}`;

    return Promise.resolve({
      provider: 'development-email',
      providerMessageId,
      providerResponse: {
        accepted: true,
        recipient,
        title,
        contentLength: content.length,
      },
    });
  }
}
