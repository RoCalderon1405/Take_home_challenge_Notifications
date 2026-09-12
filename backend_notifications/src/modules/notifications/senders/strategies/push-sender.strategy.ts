import { Inject, Injectable } from '@nestjs/common';

import { NotificationChannelCode } from '../../models';
import type {
  NotificationSenderStrategy,
  NotificationSendInput,
  NotificationSendResult,
} from '../contracts';
import type { PushProvider } from '../providers/push/push-provider';
import { PUSH_PROVIDER } from '../providers/push/push-provider.constants';

/**
 * Notification sender strategy for the Push channel.
 */
@Injectable()
export class PushSenderStrategy implements NotificationSenderStrategy {
  readonly channel = NotificationChannelCode.PUSH;

  constructor(
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: PushProvider,
  ) {}

  get providerName(): string {
    return this.pushProvider.name;
  }

  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    return this.pushProvider.send(input);
  }
}
