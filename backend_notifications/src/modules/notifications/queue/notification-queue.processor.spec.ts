import type { Job } from 'bullmq';

import { NotificationDeliveryService } from '../notification-delivery.service';
import { NotificationProviderError } from '../senders/errors/notification-provider.error';

import type { SendNotificationJob } from './contracts/send-notification-job';

import { NotificationJobName } from './notification-queue.constants';

/**
 * BullMQ infrastructure is replaced because this is a unit test.
 * Redis and a real worker are not required.
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

  const createJob = (
    name: string = NotificationJobName.SEND,
  ): Job<SendNotificationJob> =>
    ({
      name,
      data: {
        userId,
        notificationId,
      },
    }) as Job<SendNotificationJob>;

  beforeEach(() => {
    jest.clearAllMocks();

    processor = new NotificationQueueProcessor(
      deliveryServiceMock as unknown as NotificationDeliveryService,
    );
  });

  it('should process a send notification job', async () => {
    deliveryServiceMock.send.mockResolvedValue(undefined);

    await processor.process(createJob());

    expect(deliveryServiceMock.send).toHaveBeenCalledWith(
      userId,
      notificationId,
    );
  });

  it('should reject unsupported job names', async () => {
    await expect(
      processor.process(createJob('unsupported-job')),
    ).rejects.toThrow('Unsupported notification job: unsupported-job');

    expect(deliveryServiceMock.send).not.toHaveBeenCalled();
  });

  it('should stop retries for non-retryable provider errors', async () => {
    const providerError = new NotificationProviderError(
      'twilio',
      'Twilio failed to send SMS: invalid destination',
      false,
      21211,
    );

    deliveryServiceMock.send.mockRejectedValue(providerError);

    await expect(processor.process(createJob())).rejects.toMatchObject({
      name: 'UnrecoverableError',
      message: 'Twilio failed to send SMS: invalid destination',
    });
  });

  it('should preserve retryable provider errors so BullMQ can retry them', async () => {
    const providerError = new NotificationProviderError(
      'twilio',
      'Twilio failed to send SMS: HTTP 503',
      true,
      503,
    );

    deliveryServiceMock.send.mockRejectedValue(providerError);

    await expect(processor.process(createJob())).rejects.toBe(providerError);
  });
});
