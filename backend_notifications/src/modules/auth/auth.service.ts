import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { UsersService } from '../users/users.service';
import { UserMapper } from '../users/mappers';
import { UserModel } from '../users/models';

import { LoginDto } from './request';

/**
 * Handles authentication operations such as credential validation
 * and access-token generation.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UsersService,
    private readonly _passwordHasherService: PasswordHaserService,
    private readonly _jwtService: JwtService,
  ) {}

  /**
   * Validates a user's credentials.
   *
   * Returns a safe application user model when the credentials are valid.
   * The same unauthorized response is used for unknown users and invalid
   * passwords to avoid exposing registered email addresses.
   *
   * @param loginDto Credentials provided by the client.
   * @returns The authenticated user without sensitive authentication data.
   * @throws UnauthorizedException When the credentials are invalid.
   */
  async validateCredentials(loginDto: LoginDto): Promise<UserModel> {
    const { email, password } = loginDto;

    const user = await this._userService.findOneByEmailForAuth(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this._passwordHasherService.verify(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return UserMapper.toModel(user);
  }

  /**
   * Creates an access token for an already authenticated user.
   *
   * The JWT payload contains only non-sensitive identification data.
   * JWT payloads are signed but not encrypted, so sensitive authentication
   * information must never be included.
   *
   * @param user Authenticated user provided by Passport.
   * @returns The authenticated user and its access token.
   */
  async login(user: UserModel) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    // TODO 1:
    // Generate the JWT using the asynchronous JwtService method.
    const accessToken = await this._jwtService.signAsync(payload);
    return {
      user,
      accessToken,
      // TODO 2:
      // Return the generated token with the property name accessToken.
    };
  }
}
