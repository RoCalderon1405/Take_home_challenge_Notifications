import { NotificationChannelCode } from '../../models';
import type { SmsProvider } from '../providers/sms/sms-provider';
import { SmsSenderStrategy } from './sms-sender.strategy';

describe('SmsSenderStrategy', () => {
  it('should delegate SMS delivery to the configured provider', async () => {
    const input = {
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Hello',
      content: 'Body',
    };

    const result = {
      provider: 'test-sms',
      providerMessageId: 'message-1',
    };

    const sendMock = jest.fn().mockResolvedValue(result);
    const provider: SmsProvider = {
      send: sendMock,
    };

    const strategy = new SmsSenderStrategy(provider);

    await expect(strategy.send(input)).resolves.toEqual(result);
    expect(strategy.channel).toBe(NotificationChannelCode.SMS);
    expect(sendMock).toHaveBeenCalledWith(input);
  });
});
