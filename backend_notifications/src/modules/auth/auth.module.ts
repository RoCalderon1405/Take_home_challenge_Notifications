import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { SecurityModule } from '@app/common/security/security.module';

import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard, JwtAuthGuard, LocalAuthGuard } from './guards';
import { GoogleStrategy, JwtStrategy, LocalStrategy } from './strategies';

/**
 * Provides authentication capabilities for the application.
 *
 * It configures Passport strategies for local credentials, Google OAuth 2.0
 * and JWT-based authorization.
 */
@Module({
  imports: [
    UsersModule,
    SecurityModule,
    PassportModule,

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('JWT_EXPIRES_IN_SECONDS'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
