import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Provides notification creation and management capabilities.
 *
 * Notification ownership is derived from the authenticated user and
 * persistence operations are delegated to Prisma through PrismaModule.
 */
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
