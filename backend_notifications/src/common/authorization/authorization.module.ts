import { Module } from '@nestjs/common';

import { RolesGuard } from './guards/roles.guard';

/**
 * Provides reusable role-based authorization components.
 *
 * This module is independent from the authentication mechanism so feature
 * modules can enforce authorization rules without depending on AuthModule.
 */
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class AuthorizationModule {}
