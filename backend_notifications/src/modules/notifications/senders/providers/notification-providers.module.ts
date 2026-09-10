import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConsoleEmailProvider } from './email/console-email.provider';
import type { EmailProvider } from './email/email-provider';
import { EMAIL_PROVIDER } from './email/email-provider.constants';
import { ResendEmailProvider } from './email/resend-email.provider';

import { ConsoleSmsProvider } from './sms/console-sms.provider';
import type { SmsProvider } from './sms/sms-provider';
import { SMS_PROVIDER } from './sms/sms-provider.constants';
import { TwilioSmsProvider } from './sms/twilio-sms.provider';

import { ConsolePushProvider } from './push/console-push.provider';
import { FirebasePushProvider } from './push/firebase-push.provider';
import type { PushProvider } from './push/push-provider';
import { PUSH_PROVIDER } from './push/push-provider.constants';

/**
 * Registers the concrete infrastructure provider selected for each channel.
 *
 * Console implementations remain available for development/tests while real
 * provider implementations are selected explicitly through configuration.
 */
@Module({
  providers: [
    ConsoleEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsoleEmailProvider,
        resendProvider: ResendEmailProvider,
      ): EmailProvider => {
        const provider = configService.getOrThrow<string>('EMAIL_PROVIDER');

        return provider === 'resend' ? resendProvider : consoleProvider;
      },
      inject: [ConfigService, ConsoleEmailProvider, ResendEmailProvider],
    },

    ConsoleSmsProvider,
    TwilioSmsProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsoleSmsProvider,
        twilioProvider: TwilioSmsProvider,
      ): SmsProvider => {
        const provider = configService.getOrThrow<string>('SMS_PROVIDER');

        return provider === 'twilio' ? twilioProvider : consoleProvider;
      },
      inject: [ConfigService, ConsoleSmsProvider, TwilioSmsProvider],
    },

    ConsolePushProvider,
    FirebasePushProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsolePushProvider,
        firebaseProvider: FirebasePushProvider,
      ): PushProvider => {
        const provider = configService.getOrThrow<string>('PUSH_PROVIDER');

        return provider === 'firebase' ? firebaseProvider : consoleProvider;
      },
      inject: [ConfigService, ConsolePushProvider, FirebasePushProvider],
    },
  ],
  exports: [EMAIL_PROVIDER, SMS_PROVIDER, PUSH_PROVIDER],
})
export class NotificationProvidersModule {}
