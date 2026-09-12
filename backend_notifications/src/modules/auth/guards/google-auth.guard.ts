import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

/**
 * Starts and completes Google's OAuth 2.0 flow through Passport.
 *
 * The guard is registered even when Google OAuth is disabled so the rest of
 * the application can run without Google credentials. Requests to the Google
 * endpoints fail explicitly until GOOGLE_OAUTH_ENABLED is enabled.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const enabled = this.configService.get<boolean>('GOOGLE_OAUTH_ENABLED');

    if (!enabled) {
      throw new ServiceUnavailableException('Google OAuth is not enabled');
    }

    return super.canActivate(context);
  }
}
