import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import KeyvRedis from '@keyv/redis';
import { Envs } from '@app/config/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppService } from '@app/app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AppController } from '@app/app.controller';
import { UsersModule } from '@app/modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '../.env'),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        return {
          ttl: 5000,
          stores: [new KeyvRedis(Envs.REDIS_URL)],
        };
      },
    }),
    PrismaModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
