import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

import type { NotificationSenderStrategy } from './senders/contracts';

import { NotificationDispatcherService } from './senders/notification-dispatcher.service';
import { NOTIFICATION_SENDER_STRATEGIES } from './senders/notification-sender.constants';
import { NotificationSenderRegistry } from './senders/notification-sender.registry';

import { EmailSenderStrategy } from './senders/strategies/email-sender.strategy';
import { PushSenderStrategy } from './senders/strategies/push-sender.strategy';
import { SmsSenderStrategy } from './senders/strategies/sms-sender.strategy';
import { NotificationDeliveryService } from './notification-delivery.service';

/**
 * Provides notification management and delivery capabilities.
 *
 * Notification sender strategies are registered through a common
 * dependency injection token and resolved by NotificationSenderRegistry.
 */
@Module({
  imports: [PrismaModule],

  controllers: [NotificationsController],

  providers: [
    NotificationsService,
    NotificationDeliveryService,

    EmailSenderStrategy,
    SmsSenderStrategy,
    PushSenderStrategy,

    {
      provide: NOTIFICATION_SENDER_STRATEGIES,

      useFactory: (
        emailSender: EmailSenderStrategy,
        smsSender: SmsSenderStrategy,
        pushSender: PushSenderStrategy,
      ): NotificationSenderStrategy[] => [emailSender, smsSender, pushSender],

      inject: [EmailSenderStrategy, SmsSenderStrategy, PushSenderStrategy],
    },

    NotificationSenderRegistry,
    NotificationDispatcherService,
  ],

  exports: [NotificationsService],
})
export class NotificationsModule {}
