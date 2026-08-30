import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Starts Passport's local authentication flow.
 *
 * The "local" strategy is provided by passport-local and is implemented
 * in LocalStrategy.
 *
 * When authentication succeeds, Passport attaches the authenticated
 * user returned by LocalStrategy.validate() to request.user.
 *
 * When authentication fails, the request is rejected with HTTP 401
 * before reaching the controller.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
