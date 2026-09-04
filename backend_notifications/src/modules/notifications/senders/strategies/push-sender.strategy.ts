import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';

/**
 * Delivers notifications through the Push channel.
 *
 * This implementation currently simulates a provider response.
 * A real push notification provider can replace the internal delivery
 * logic later without changing the notification orchestration layer.
 */
@Injectable()
export class PushSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.PUSH;

  private readonly logger = new Logger(PushSenderStrategy.name);

  /**
   * Sends a notification through the Push channel.
   *
   * @param input Normalized notification data required for delivery.
   * @returns Normalized provider delivery information.
   */
  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    const { notificationId, recipient, title, content } = input;

    this.logger.log(
      `Sending PUSH notification ${notificationId} to ${recipient}`,
    );

    const providerMessageId = `push-${notificationId}-${Date.now()}`;

    return Promise.resolve({
      provider: 'development-push',
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
