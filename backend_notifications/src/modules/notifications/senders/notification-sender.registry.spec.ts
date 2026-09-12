import { InternalServerErrorException } from '@nestjs/common';

import { NotificationChannelCode } from '../models';
import type {
  NotificationSendInput,
  NotificationSendResult,
  NotificationSenderStrategy,
} from './contracts/notification-sender.strategy';
import { NotificationSenderRegistry } from './notification-sender.registry';

describe('NotificationSenderRegistry', () => {
  const emailSendMock = jest.fn<
    Promise<NotificationSendResult>,
    [NotificationSendInput]
  >();

  const smsSendMock = jest.fn<
    Promise<NotificationSendResult>,
    [NotificationSendInput]
  >();

  const emailStrategy: NotificationSenderStrategy = {
    channel: NotificationChannelCode.EMAIL,
    providerName: 'test-email-provider',
    send: emailSendMock,
  };

  const smsStrategy: NotificationSenderStrategy = {
    channel: NotificationChannelCode.SMS,
    providerName: 'test-sms-provider',
    send: smsSendMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the strategy registered for a channel', () => {
    const registry = new NotificationSenderRegistry([
      emailStrategy,
      smsStrategy,
    ]);

    const result = registry.get(NotificationChannelCode.EMAIL);

    expect(result).toBe(emailStrategy);
    expect(result.providerName).toBe('test-email-provider');
  });

  it('should return the correct strategy for each registered channel', () => {
    const registry = new NotificationSenderRegistry([
      emailStrategy,
      smsStrategy,
    ]);

    expect(registry.get(NotificationChannelCode.EMAIL)).toBe(emailStrategy);

    expect(registry.get(NotificationChannelCode.SMS)).toBe(smsStrategy);
  });

  it('should throw when no strategy is registered for the requested channel', () => {
    const registry = new NotificationSenderRegistry([emailStrategy]);

    expect(() => registry.get(NotificationChannelCode.PUSH)).toThrow(
      InternalServerErrorException,
    );

    expect(() => registry.get(NotificationChannelCode.PUSH)).toThrow(
      'Notification sender is not configured for the selected channel',
    );
  });

  it('should reject duplicate strategies for the same channel', () => {
    const duplicateEmailStrategy: NotificationSenderStrategy = {
      channel: NotificationChannelCode.EMAIL,
      providerName: 'second-email-provider',
      send: jest.fn<Promise<NotificationSendResult>, [NotificationSendInput]>(),
    };

    expect(
      () =>
        new NotificationSenderRegistry([emailStrategy, duplicateEmailStrategy]),
    ).toThrow('Duplicate notification sender strategy for channel EMAIL');
  });

  it('should allow all supported channels to be registered together', () => {
    const pushStrategy: NotificationSenderStrategy = {
      channel: NotificationChannelCode.PUSH,
      providerName: 'test-push-provider',
      send: jest.fn<Promise<NotificationSendResult>, [NotificationSendInput]>(),
    };

    const registry = new NotificationSenderRegistry([
      emailStrategy,
      smsStrategy,
      pushStrategy,
    ]);

    expect(registry.get(NotificationChannelCode.EMAIL)).toBe(emailStrategy);

    expect(registry.get(NotificationChannelCode.SMS)).toBe(smsStrategy);

    expect(registry.get(NotificationChannelCode.PUSH)).toBe(pushStrategy);
  });
});
