import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { UserMapper } from '../users/mappers';
import { UserAuthProvider, UserStatus, type UserModel } from '../users/models';
import { UsersService } from '../users/users.service';

import type { GoogleProfileModel } from './models';
import { LoginDto } from './request';

/**
 * Handles authentication operations such as credential validation, Google
 * account authentication and access-token generation.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UsersService,
    private readonly _passwordHasherService: PasswordHaserService,
    private readonly _jwtService: JwtService,
  ) {}

  /**
   * Validates a user's local email/password credentials.
   */
  async validateCredentials(loginDto: LoginDto): Promise<UserModel> {
    const { email, password } = loginDto;

    const user = await this._userService.findOneByEmailForAuth(email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this._passwordHasherService.verify(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userModel = UserMapper.toModel(user);

    this.assertActive(userModel);

    return userModel;
  }

  /**
   * Resolves a Google account to an application user.
   *
   * Existing Google identities are reused. If the Google email already belongs
   * to a local account, the identity is linked to that account. Otherwise an
   * OAuth-only user is created with no local password.
   */
  async authenticateGoogle(profile: GoogleProfileModel): Promise<UserModel> {
    const user = await this._userService.findOrCreateByExternalIdentity({
      provider: UserAuthProvider.GOOGLE,
      providerUserId: profile.providerUserId,
      email: profile.email,
    });

    this.assertActive(user);

    return user;
  }

  /**
   * Rejects disabled accounts before a token is issued.
   */
  private assertActive(user: UserModel): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
  }

  /**
   * Creates an application JWT for an already authenticated user.
   */
  async login(user: UserModel) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this._jwtService.signAsync(payload);

    return {
      user,
      accessToken,
    };
  }
}
