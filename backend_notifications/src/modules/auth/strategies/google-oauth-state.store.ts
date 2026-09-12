import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type {
  Metadata,
  StateStore,
  StateStoreStoreCallback,
  StateStoreVerifyCallback,
} from 'passport-oauth2';

interface GoogleOAuthStatePayload {
  nonce: string;
  issuedAt: number;
}

/**
 * Stateless OAuth state store used by Passport to protect the Google redirect
 * flow against login CSRF without introducing server-side HTTP sessions.
 */
export class GoogleOAuthStateStore implements StateStore {
  private static readonly MAX_AGE_MS = 10 * 60 * 1000;

  constructor(private readonly secret: string) {}

  store(_request: Request, callback: StateStoreStoreCallback): void;
  store(
    _request: Request,
    _metadata: Metadata,
    callback: StateStoreStoreCallback,
  ): void;
  store(
    _request: Request,
    metadataOrCallback: Metadata | StateStoreStoreCallback,
    maybeCallback?: StateStoreStoreCallback,
  ): void {
    const callback =
      typeof metadataOrCallback === 'function'
        ? metadataOrCallback
        : maybeCallback;

    if (!callback) {
      throw new Error('OAuth state callback is required');
    }

    const payload: GoogleOAuthStatePayload = {
      nonce: randomBytes(24).toString('base64url'),
      issuedAt: Date.now(),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(encodedPayload);

    callback(null, `${encodedPayload}.${signature}`);
  }

  verify(
    _request: Request,
    state: string,
    callback: StateStoreVerifyCallback,
  ): void;
  verify(
    _request: Request,
    state: string,
    _metadata: Metadata,
    callback: StateStoreVerifyCallback,
  ): void;
  verify(
    _request: Request,
    state: string,
    metadataOrCallback: Metadata | StateStoreVerifyCallback,
    maybeCallback?: StateStoreVerifyCallback,
  ): void {
    const callback =
      typeof metadataOrCallback === 'function'
        ? metadataOrCallback
        : maybeCallback;

    if (!callback) {
      throw new Error('OAuth state verification callback is required');
    }

    try {
      const [encodedPayload, providedSignature, extra] = state.split('.');

      if (!encodedPayload || !providedSignature || extra) {
        callback(null, false, { message: 'Invalid OAuth state' });
        return;
      }

      const expectedSignature = this.sign(encodedPayload);
      const providedBuffer = Buffer.from(providedSignature, 'base64url');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

      if (
        providedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        callback(null, false, { message: 'Invalid OAuth state' });
        return;
      }

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as GoogleOAuthStatePayload;

      if (
        typeof payload.issuedAt !== 'number' ||
        typeof payload.nonce !== 'string' ||
        Date.now() - payload.issuedAt > GoogleOAuthStateStore.MAX_AGE_MS ||
        payload.issuedAt > Date.now() + 30_000
      ) {
        callback(null, false, { message: 'Expired OAuth state' });
        return;
      }

      callback(null, true, state);
    } catch {
      callback(null, false, { message: 'Invalid OAuth state' });
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(`google-oauth-state:${payload}`, 'utf8')
      .digest('base64url');
  }
}
