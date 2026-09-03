import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { UserModel } from '../users/models';

import { CurrentUser } from './decorators';
import {
  ApiAuthController,
  ApiGetCurrentUser,
  ApiLogin,
} from './docs/auth-swagger.decorators';
import { JwtAuthGuard, LocalAuthGuard } from './guards';
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
   *
   * LocalAuthGuard validates the credentials through Passport and places
   * the authenticated user in request.user before this handler executes.
   *
   * @param request Express request containing the authenticated user.
   * @returns Authentication response containing the user and access token.
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
   * Returns the currently authenticated user.
   *
   * @param user User authenticated through Passport JWT.
   * @returns The currently authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiGetCurrentUser()
  getProfile(@CurrentUser() user: UserModel): UserModel {
    return user;
  }
}
