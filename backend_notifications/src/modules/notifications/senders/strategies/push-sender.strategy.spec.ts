import { NotificationChannelCode } from '../../models';
import type { PushProvider } from '../providers/push/push-provider';
import { PushSenderStrategy } from './push-sender.strategy';

describe('PushSenderStrategy', () => {
  it('should delegate Push delivery to the configured provider', async () => {
    const input = {
      notificationId: 'notification-1',
      recipient: 'device-token',
      title: 'Hello',
      content: 'Body',
    };

    const result = {
      provider: 'test-push',
      providerMessageId: 'message-1',
    };

    const sendMock = jest.fn().mockResolvedValue(result);
    const provider: PushProvider = {
      send: sendMock,
    };

    const strategy = new PushSenderStrategy(provider);

    await expect(strategy.send(input)).resolves.toEqual(result);
    expect(strategy.channel).toBe(NotificationChannelCode.PUSH);
    expect(sendMock).toHaveBeenCalledWith(input);
  });
});
