import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDeliveryService } from './notification-delivery.service';

import type { NotificationSenderStrategy } from './senders/contracts';
import {
  NotificationDispatcherService,
  NOTIFICATION_SENDER_STRATEGIES,
  NotificationSenderRegistry,
} from './senders';
import { NotificationProvidersModule } from './senders/providers/notification-providers.module';
import {
  EmailSenderStrategy,
  PushSenderStrategy,
  SmsSenderStrategy,
} from './senders/strategies';

import { NotificationQueueProducer } from './queue/notification-queue.producer';
import { NOTIFICATION_QUEUE } from './queue/notification-queue.constants';
import { NotificationQueueProcessor } from './queue/notification-queue.processor';

/**
 * Provides notification management and delivery capabilities.
 *
 * Sender strategies represent notification channels. Infrastructure provider
 * selection is isolated inside NotificationProvidersModule.
 */
@Module({
  imports: [
    PrismaModule,
    NotificationProvidersModule,
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
