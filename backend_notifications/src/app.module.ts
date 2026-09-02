import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';

import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';

import { AppService } from '@app/app.service';
import { AppController } from '@app/app.controller';
import { PrismaModule } from '@app/modules/prisma/prisma.module';
import { UsersModule } from '@app/modules/users/users.module';

import { validateEnv } from '@app/config/config';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '../.env'),
      validate: validateEnv,
    }),

    CacheModule.registerAsync({
      isGlobal: true,

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL');

        return {
          ttl: 5000,
          stores: new KeyvRedis(redisUrl),
        };
      },
    }),

    PrismaModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
