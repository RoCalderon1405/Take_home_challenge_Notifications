import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';

/**
 * Delivers notifications through the SMS channel.
 *
 * This implementation currently simulates a provider response.
 * A real SMS provider can replace the internal delivery logic later
 * without changing the notification orchestration layer.
 */
@Injectable()
export class SmsSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.SMS;

  private readonly logger = new Logger(SmsSenderStrategy.name);

  /**
   * Sends a notification through the SMS channel.
   *
   * @param input Normalized notification data required for delivery.
   * @returns Normalized provider delivery information.
   */
  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    const { notificationId, recipient, content } = input;

    this.logger.log(
      `Sending SMS notification ${notificationId} to ${recipient}`,
    );

    const providerMessageId = `sms-${notificationId}-${Date.now()}`;

    return Promise.resolve({
      provider: 'development-sms',
      providerMessageId,
      providerResponse: {
        accepted: true,
        recipient,
        contentLength: content.length,
      },
    });
  }
}
