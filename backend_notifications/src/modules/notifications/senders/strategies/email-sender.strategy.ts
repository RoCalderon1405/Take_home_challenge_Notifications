import { Inject, Injectable } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';
import type { EmailProvider } from '../providers/email/email-provider';
import { EMAIL_PROVIDER } from '../providers/email/email-provider.constants';

/**
 * Notification sender strategy for the Email channel.
 *
 * Channel selection belongs to the strategy while the external delivery
 * mechanism is delegated to the configured EmailProvider implementation.
 */
@Injectable()
export class EmailSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.EMAIL;

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  get providerName(): string {
    return this.emailProvider.name;
  }

  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    return this.emailProvider.send(input);
  }
}
