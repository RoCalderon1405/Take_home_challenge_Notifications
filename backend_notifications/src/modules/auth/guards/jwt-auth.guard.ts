import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects HTTP routes using the Passport JWT strategy.
 *
 * A valid Bearer token is required before the protected controller
 * handler can execute.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
