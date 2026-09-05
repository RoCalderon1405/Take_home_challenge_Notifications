import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BullModule } from '@nestjs/bullmq';
import KeyvRedis from '@keyv/redis';

import { resolve } from 'node:path';

import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';

import { validateEnv } from '@app/config/config';

import { AuthModule } from '@app/modules/auth/auth.module';
import { NotificationsModule } from '@app/modules/notifications/notifications.module';
import { PrismaModule } from '@app/modules/prisma/prisma.module';
import { UsersModule } from '@app/modules/users/users.module';

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

    BullModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.getOrThrow<string>('REDIS_URL'));

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
          },
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
