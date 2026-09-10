import { Processor, WorkerHost } from '@nestjs/bullmq';

import { UnrecoverableError, type Job } from 'bullmq';

import { NotificationDeliveryService } from '../notification-delivery.service';
import { NotificationProviderError } from '../senders/errors/notification-provider.error';

import type { SendNotificationJob } from './contracts/send-notification-job';

import {
  NOTIFICATION_QUEUE,
  NotificationJobName,
} from './notification-queue.constants';

/**
 * Consumes notification delivery jobs from the BullMQ queue.
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationQueueProcessor extends WorkerHost {
  constructor(
    private readonly _notificationDeliveryService: NotificationDeliveryService,
  ) {
    super();
  }

  /**
   * Processes queued notification jobs.
   *
   * Permanent provider errors are converted into BullMQ
   * UnrecoverableError instances so the remaining configured attempts
   * are not consumed unnecessarily.
   *
   * @param job BullMQ job containing notification delivery data.
   */
  async process(job: Job<SendNotificationJob>): Promise<void> {
    if (job.name !== NotificationJobName.SEND) {
      throw new Error(`Unsupported notification job: ${job.name}`);
    }

    const { userId, notificationId } = job.data;

    try {
      await this._notificationDeliveryService.send(userId, notificationId);
    } catch (error: unknown) {
      if (error instanceof NotificationProviderError && !error.retryable) {
        throw new UnrecoverableError(error.message);
      }

      throw error;
    }
  }
}
