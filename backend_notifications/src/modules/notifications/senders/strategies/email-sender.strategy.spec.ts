import { NotificationChannelCode } from '../../models';
import type { EmailProvider } from '../providers/email/email-provider';
import { EmailSenderStrategy } from './email-sender.strategy';

describe('EmailSenderStrategy', () => {
  it('should delegate email delivery to the configured provider', async () => {
    const input = {
      notificationId: 'notification-1',
      recipient: 'user@example.com',
      title: 'Hello',
      content: 'Body',
    };

    const result = {
      provider: 'test-email',
      providerMessageId: 'message-1',
    };

    const sendMock = jest.fn().mockResolvedValue(result);
    const provider: EmailProvider = {
      send: sendMock,
    };

    const strategy = new EmailSenderStrategy(provider);

    await expect(strategy.send(input)).resolves.toEqual(result);
    expect(strategy.channel).toBe(NotificationChannelCode.EMAIL);
    expect(sendMock).toHaveBeenCalledWith(input);
  });
});
