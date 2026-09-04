import { Injectable } from '@nestjs/common';

import type { NotificationModel } from '../models';

import type { NotificationSendResult } from './contracts';
import { NotificationSenderRegistry } from './notification-sender.registry';

/**
 * Dispatches notifications through the sender strategy associated
 * with their configured channel.
 *
 * This service contains no channel-specific logic. Strategy resolution
 * is delegated to NotificationSenderRegistry.
 */
@Injectable()
export class NotificationDispatcherService {
  constructor(private readonly _senderRegistry: NotificationSenderRegistry) {}

  /**
   * Sends a notification using the strategy registered for its channel.
   *
   * @param notification Notification to deliver.
   * @returns Normalized delivery result returned by the selected strategy.
   */
  async send(notification: NotificationModel): Promise<NotificationSendResult> {
    const strategy = this._senderRegistry.get(notification.channel);

    return await strategy.send({
      notificationId: notification.id,
      recipient: notification.recipient,
      title: notification.title,
      content: notification.content,
    });
  }
}
