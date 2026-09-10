import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createSign } from 'node:crypto';

import type { NotificationSendInput } from '../../contracts';
import { NotificationProviderError } from '../../errors/notification-provider.error';

import type { PushProvider, PushProviderResult } from './push-provider';

interface GoogleOAuthTokenPayload {
  access_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface FirebaseSendPayload {
  name?: unknown;

  error?: {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
}

interface CachedAccessToken {
  token: string;
  expiresAt: number;
}

/**
 * Sends Push notifications through Firebase Cloud Messaging HTTP v1.
 *
 * The provider authenticates through a Firebase service account,
 * obtains a short-lived OAuth 2.0 access token and reuses it until
 * shortly before expiration.
 *
 * Notifications are targeted using Firebase Installation IDs (FIDs).
 */
@Injectable()
export class FirebasePushProvider implements PushProvider {
  private static readonly PROVIDER = 'firebase';

  private static readonly GOOGLE_TOKEN_ENDPOINT =
    'https://oauth2.googleapis.com/token';

  private static readonly FCM_SCOPE =
    'https://www.googleapis.com/auth/firebase.messaging';

  private static readonly TOKEN_EXPIRY_SAFETY_MS = 60_000;

  private cachedAccessToken?: CachedAccessToken;

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationSendInput): Promise<PushProviderResult> {
    const projectId = this.configService.getOrThrow<string>(
      'FIREBASE_PROJECT_ID',
    );

    const accessToken = await this.getAccessToken();

    const endpoint =
      `https://fcm.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}/messages:send`;

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${accessToken}`,

          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          message: {
            fid: input.recipient,

            notification: {
              title: input.title,
              body: input.content,
            },

            data: {
              notificationId: input.notificationId,
            },
          },
        }),
      });
    } catch (error: unknown) {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase request failed: ${this.getErrorMessage(error)}`,
        true,
      );
    }

    let payload: FirebaseSendPayload;

    try {
      payload = (await response.json()) as FirebaseSendPayload;
    } catch {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase returned an invalid response: HTTP ${response.status}`,
        this.isRetryableStatus(response.status),
        response.status,
      );
    }

    if (!response.ok) {
      const providerMessage =
        this.readString(payload.error?.message) ?? `HTTP ${response.status}`;

      const providerCode =
        this.readProviderCode(payload.error?.code) ??
        this.readString(payload.error?.status) ??
        response.status;

      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase failed to send push notification: ${providerMessage}`,
        this.isRetryableStatus(response.status),
        providerCode,
      );
    }

    const messageName = this.readString(payload.name);

    if (!messageName) {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        'Firebase did not return a message identifier',
        false,
      );
    }

    return {
      provider: FirebasePushProvider.PROVIDER,

      providerMessageId: messageName,

      providerResponse: {
        name: messageName,
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (
      this.cachedAccessToken &&
      this.cachedAccessToken.expiresAt -
        FirebasePushProvider.TOKEN_EXPIRY_SAFETY_MS >
        now
    ) {
      return this.cachedAccessToken.token;
    }

    const assertion = this.createServiceAccountAssertion();

    let response: Response;

    try {
      response = await fetch(FirebasePushProvider.GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },

        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',

          assertion,
        }),
      });
    } catch (error: unknown) {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase OAuth token request failed: ${this.getErrorMessage(error)}`,
        true,
      );
    }

    let payload: GoogleOAuthTokenPayload;

    try {
      payload = (await response.json()) as GoogleOAuthTokenPayload;
    } catch {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase OAuth token request returned an invalid response: HTTP ${response.status}`,
        this.isRetryableStatus(response.status),
        response.status,
      );
    }

    if (!response.ok) {
      const description = this.readString(payload.error_description);

      const oauthError = this.readString(payload.error);

      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        `Firebase OAuth token request failed: ${
          description ?? oauthError ?? `HTTP ${response.status}`
        }`,
        this.isRetryableStatus(response.status),
        response.status,
      );
    }

    const accessToken = this.readString(payload.access_token);

    const expiresIn = this.readNumber(payload.expires_in);

    if (!accessToken || !expiresIn) {
      throw new NotificationProviderError(
        FirebasePushProvider.PROVIDER,
        'Firebase OAuth token response is incomplete',
        false,
      );
    }

    this.cachedAccessToken = {
      token: accessToken,

      expiresAt: now + expiresIn * 1_000,
    };

    return accessToken;
  }

  private createServiceAccountAssertion(): string {
    const clientEmail = this.configService.getOrThrow<string>(
      'FIREBASE_CLIENT_EMAIL',
    );

    const privateKey = this.configService
      .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
      .replace(/\\n/g, '\n');

    const issuedAt = Math.floor(Date.now() / 1_000);

    const header = this.base64UrlEncode({
      alg: 'RS256',
      typ: 'JWT',
    });

    const claims = this.base64UrlEncode({
      iss: clientEmail,
      scope: FirebasePushProvider.FCM_SCOPE,
      aud: FirebasePushProvider.GOOGLE_TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3_600,
    });

    const unsignedToken = `${header}.${claims}`;

    const signature = createSign('RSA-SHA256')
      .update(unsignedToken)
      .sign(privateKey)
      .toString('base64url');

    return `${unsignedToken}.${signature}`;
  }

  /**
   * Only transient infrastructure failures are retried automatically.
   *
   * Client/configuration errors require intervention and must not
   * consume additional BullMQ attempts.
   */
  private isRetryableStatus(status: number): boolean {
    return status === 408 || status >= 500;
  }

  private base64UrlEncode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private readProviderCode(value: unknown): string | number | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
