import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { UserModel } from '../../users/models';

import { AuthService } from '../auth.service';
import { LoginDto } from '../request';

/**
 * Authenticates users with email and password using Passport Local.
 *
 * Passport Local expects a "username" field by default. The strategy is
 * configured to use "email" as the username field for this application.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly _authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  /**
   * Validates credentials extracted by Passport from the request body.
   *
   * The returned user is attached by Passport to request.user.
   *
   * @param email Email provided by the client.
   * @param password Plain-text password provided by the client.
   * @returns The authenticated user without sensitive authentication data.
   */
  async validate(email: string, password: string): Promise<UserModel> {
    const loginDto: LoginDto = {
      email,
      password,
    };

    return this._authService.validateCredentials(loginDto);
  }
}
