import { Inject, Injectable } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';
import type { SmsProvider } from '../providers/sms/sms-provider';
import { SMS_PROVIDER } from '../providers/sms/sms-provider.constants';

/**
 * Notification sender strategy for the SMS channel.
 */
@Injectable()
export class SmsSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.SMS;

  constructor(
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: SmsProvider,
  ) {}

  get providerName(): string {
    return this.smsProvider.name;
  }

  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    return this.smsProvider.send(input);
  }
}
