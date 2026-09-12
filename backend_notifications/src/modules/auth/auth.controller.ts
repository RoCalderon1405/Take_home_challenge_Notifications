import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { UserModel } from '../users/models';

import { CurrentUser } from './decorators';
import {
  ApiAuthController,
  ApiGetCurrentUser,
  ApiGoogleCallback,
  ApiGoogleLogin,
  ApiLogin,
} from './docs/auth-swagger.decorators';
import { GoogleAuthGuard, JwtAuthGuard, LocalAuthGuard } from './guards';
import { AuthService } from './auth.service';

/**
 * Exposes authentication-related HTTP endpoints.
 */
@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  /**
   * Authenticates a user using email and password.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiLogin()
  async login(
    @Req()
    request: Request & { user: UserModel },
  ) {
    return await this._authService.login(request.user);
  }

  /**
   * Redirects the browser to Google's OAuth 2.0 consent/login page.
   *
   * The GoogleAuthGuard performs the redirect before this handler executes.
   */
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiGoogleLogin()
  googleLogin(): void {
    // Passport redirects before normal response handling reaches this point.
  }

  /**
   * Completes the Google OAuth 2.0 flow and returns the application's JWT.
   *
   * Passport resolves the Google account to a UserModel and stores it in
   * request.user before this handler executes.
   */
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiGoogleCallback()
  async googleCallback(
    @Req()
    request: Request & { user: UserModel },
  ) {
    return await this._authService.login(request.user);
  }

  /**
   * Returns the currently authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiGetCurrentUser()
  getProfile(@CurrentUser() user: UserModel): UserModel {
    return user;
  }
}
