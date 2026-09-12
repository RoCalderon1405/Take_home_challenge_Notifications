import { NotificationChannelCode, NotificationStatus } from '../models';
import type { NotificationModel } from '../models';

import type {
  NotificationSendInput,
  NotificationSendResult,
  NotificationSenderStrategy,
} from './contracts/notification-sender.strategy';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationSenderRegistry } from './notification-sender.registry';

describe('NotificationDispatcherService', () => {
  const sendMock = jest.fn<
    Promise<NotificationSendResult>,
    [NotificationSendInput]
  >();

  const strategyMock: NotificationSenderStrategy = {
    channel: NotificationChannelCode.EMAIL,
    providerName: 'test-email-provider',
    send: sendMock,
  };

  const registryMock = {
    get: jest.fn<NotificationSenderStrategy, [NotificationChannelCode]>(),
  };

  let service: NotificationDispatcherService;

  const notification: NotificationModel = {
    id: 'notification-1',
    userId: 'user-1',
    channel: NotificationChannelCode.EMAIL,
    title: 'Welcome',
    content: 'Hello from Notifications',
    recipient: 'user@example.com',
    status: NotificationStatus.PENDING,
    lastError: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-09-12T00:00:00.000Z'),
    updatedAt: new Date('2026-09-12T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    registryMock.get.mockReturnValue(strategyMock);

    service = new NotificationDispatcherService(
      registryMock as unknown as NotificationSenderRegistry,
    );
  });

  it('should return the provider name for the requested channel', () => {
    const providerName = service.getProviderName(NotificationChannelCode.EMAIL);

    expect(registryMock.get).toHaveBeenCalledWith(
      NotificationChannelCode.EMAIL,
    );

    expect(providerName).toBe('test-email-provider');
  });

  it('should delegate notification delivery to the registered strategy', async () => {
    const providerResult: NotificationSendResult = {
      provider: 'test-email-provider',
      providerMessageId: 'message-1',
      providerResponse: {
        accepted: true,
      },
    };

    sendMock.mockResolvedValue(providerResult);

    const result = await service.send(notification);

    expect(registryMock.get).toHaveBeenCalledWith(
      NotificationChannelCode.EMAIL,
    );

    expect(sendMock).toHaveBeenCalledTimes(1);

    expect(sendMock).toHaveBeenCalledWith({
      notificationId: 'notification-1',
      recipient: 'user@example.com',
      title: 'Welcome',
      content: 'Hello from Notifications',
    });

    expect(result).toEqual(providerResult);
  });

  it('should propagate an error thrown by the selected strategy', async () => {
    const providerError = new Error('Provider unavailable');

    sendMock.mockRejectedValue(providerError);

    await expect(service.send(notification)).rejects.toBe(providerError);

    expect(registryMock.get).toHaveBeenCalledWith(
      NotificationChannelCode.EMAIL,
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
