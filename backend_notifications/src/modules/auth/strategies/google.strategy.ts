import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import type { UserModel } from '../../users/models';

import { AuthService } from '../auth.service';
import { GoogleOAuthStateStore } from './google-oauth-state.store';

/**
 * Authenticates users with Google OAuth 2.0.
 *
 * Only the stable Google account id and email are passed into the application.
 * Provider access/refresh tokens are deliberately not stored because the
 * application only needs Google for authentication, not for calling Google APIs.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') ?? 'google-oauth-disabled';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') ??
      'google-oauth-disabled';
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:3000/api/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      store: new GoogleOAuthStateStore(
        configService.getOrThrow<string>('JWT_SECRET'),
      ),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<UserModel> {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!profile.id || !email) {
      throw new UnauthorizedException(
        'Google account did not provide a usable identity',
      );
    }

    return await this.authService.authenticateGoogle({
      providerUserId: profile.id,
      email,
    });
  }
}
