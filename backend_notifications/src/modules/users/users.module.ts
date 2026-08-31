import { Module } from '@nestjs/common';

import { AuthorizationModule } from '@app/common/authorization/authorization.module';
import { SecurityModule } from '@app/common/security/security.module';

import { PrismaModule } from '../prisma/prisma.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Provides user management capabilities and their authorization dependencies.
 */
@Module({
  imports: [PrismaModule, SecurityModule, AuthorizationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
