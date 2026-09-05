import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

import type { NotificationSenderStrategy } from './senders/contracts';

import {
  NotificationDispatcherService,
  NOTIFICATION_SENDER_STRATEGIES,
  NotificationSenderRegistry,
} from './senders';

import {
  EmailSenderStrategy,
  PushSenderStrategy,
  SmsSenderStrategy,
} from './senders/strategies';

import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationQueueProducer } from './queue/notification-queue.producer';
import { NOTIFICATION_QUEUE } from './queue/notification-queue.constants';
import { NotificationQueueProcessor } from './queue/notification-queue.processor';

/**
 * Provides notification management and delivery capabilities.
 *
 * Notification sender strategies are registered through a common
 * dependency injection token and resolved by NotificationSenderRegistry.
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
  ],

  controllers: [NotificationsController],

  providers: [
    NotificationsService,
    NotificationDeliveryService,

    NotificationQueueProcessor,
    NotificationQueueProducer,

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
