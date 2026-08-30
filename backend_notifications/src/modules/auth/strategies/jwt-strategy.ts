import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserModel, UserStatus } from '../../users/models';
import { UsersService } from '../../users/users.service';

import { JwtPayload } from '../models';

/**
 * Authenticates requests using JWT access tokens.
 *
 * Passport extracts the token from the Authorization header and verifies
 * its signature and expiration before invoking validate().
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly _usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Resolves the current user from a verified JWT.
   *
   * The account is loaded from persistence on each authenticated request
   * so deleted, banned or inactive users cannot continue using an otherwise
   * valid access token.
   *
   * @param payload Verified JWT payload.
   * @returns The authenticated active user.
   * @throws UnauthorizedException When the token no longer represents
   * an account allowed to authenticate.
   */
  async validate(payload: JwtPayload): Promise<UserModel> {
    let user: UserModel;

    try {
      user = await this._usersService.findOneById(payload.sub);
    } catch (error: unknown) {
      /*
       * A missing user is an authentication failure in this context,
       * therefore it must result in 401 instead of the service's normal 404.
       *
       * Other unexpected errors are allowed to propagate.
       */
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Invalid access token');
      }

      throw error;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }
}
