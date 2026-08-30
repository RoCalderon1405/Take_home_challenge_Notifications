import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import type { UserModel } from '../users/models';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './decorators';

/**
 * Exposes authentication-related HTTP endpoints.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  /**
   * Authenticates a user using email and password.
   *
   * LocalAuthGuard executes before this handler and delegates credential
   * validation to Passport's local strategy.
   *
   * When authentication succeeds, Passport attaches the authenticated
   * user to request.user.
   *
   * @param request Express request containing the authenticated user.
   * @returns Authentication response containing the user and access token.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req()
    request: Request & { user: UserModel },
  ) {
    // TODO 3:
    // Call AuthService.login() using the authenticated user
    // that Passport placed in request.user.
    return await this._authService.login(request.user);
  }

  /**
   * Returns the currently authenticated user.
   *
   * JwtAuthGuard requires a valid Bearer access token. JwtStrategy resolves
   * the account and Passport attaches the resulting user to request.user.
   *
   * @param user User authenticated by Passport JWT.
   * @returns The currently authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: UserModel): UserModel {
    return user;
  }
}
