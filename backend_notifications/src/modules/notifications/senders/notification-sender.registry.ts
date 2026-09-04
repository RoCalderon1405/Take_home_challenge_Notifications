import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import type { NotificationChannelCode } from '../models';
import type { NotificationSenderStrategy } from './contracts';

import { NOTIFICATION_SENDER_STRATEGIES } from './notification-sender.constants';

/**
 * Resolves the sender strategy associated with a notification channel.
 */
@Injectable()
export class NotificationSenderRegistry {
  private readonly logger = new Logger(NotificationSenderRegistry.name);

  private readonly strategies = new Map<
    NotificationChannelCode,
    NotificationSenderStrategy
  >();

  constructor(
    @Inject(NOTIFICATION_SENDER_STRATEGIES)
    strategies: NotificationSenderStrategy[],
  ) {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  /**
   * Returns the strategy responsible for the requested channel.
   */
  get(channel: NotificationChannelCode): NotificationSenderStrategy {
    const strategy = this.strategies.get(channel);

    if (!strategy) {
      this.logger.error(
        `No notification sender strategy registered for channel ${channel}`,
      );

      throw new InternalServerErrorException(
        'Notification sender is not configured for the selected channel',
      );
    }

    return strategy;
  }

  /**
   * Registers a sender strategy by channel.
   */
  private register(strategy: NotificationSenderStrategy): void {
    if (this.strategies.has(strategy.channel)) {
      throw new Error(
        `Duplicate notification sender strategy for channel ${strategy.channel}`,
      );
    }

    this.strategies.set(strategy.channel, strategy);
  }
}
