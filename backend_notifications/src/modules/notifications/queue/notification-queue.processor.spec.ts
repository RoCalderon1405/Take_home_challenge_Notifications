import type { Job } from 'bullmq';

import { NotificationDeliveryService } from '../notification-delivery.service';

import type { SendNotificationJob } from './contracts/send-notification-job';

import { NotificationJobName } from './notification-queue.constants';

/**
 * BullMQ is replaced because this is a unit test.
 * The real Worker and Redis connection are not required.
 */
jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => undefined,
  WorkerHost: class WorkerHost {},
}));

import { NotificationQueueProcessor } from './notification-queue.processor';

describe('NotificationQueueProcessor', () => {
  let processor: NotificationQueueProcessor;

  const deliveryServiceMock = {
    send: jest.fn(),
  };

  const userId = '65d6e602-ca87-4fc1-aac5-971f36a22aaa';

  const notificationId = '70a7ad1a-8871-4b94-afca-201e8f6f0225';

  beforeEach(() => {
    jest.clearAllMocks();

    processor = new NotificationQueueProcessor(
      deliveryServiceMock as unknown as NotificationDeliveryService,
    );
  });

  it('should process a send notification job', async () => {
    const job = {
      name: NotificationJobName.SEND,
      data: {
        userId,
        notificationId,
      },
    } as Job<SendNotificationJob>;

    deliveryServiceMock.send.mockResolvedValue(undefined);

    await processor.process(job);

    expect(deliveryServiceMock.send).toHaveBeenCalledWith(
      userId,
      notificationId,
    );
  });

  it('should reject unsupported job names', async () => {
    const job = {
      name: 'unsupported-job',
      data: {
        userId,
        notificationId,
      },
    } as Job<SendNotificationJob>;

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported notification job: unsupported-job',
    );

    expect(deliveryServiceMock.send).not.toHaveBeenCalled();
  });
});
