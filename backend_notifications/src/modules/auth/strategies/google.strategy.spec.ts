jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () =>
    class {
      constructor() {}
    },
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';

import { UserRole, UserStatus, type UserModel } from '../../users/models';
import { AuthService } from '../auth.service';

import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  const authServiceMock = {
    authenticateGoogle: jest.fn(),
  };

  const configValues: Record<string, string> = {
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
    JWT_SECRET: '12345678901234567890123456789012',
  };

  const configServiceMock = {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];

      if (!value) {
        throw new Error(`Missing config: ${key}`);
      }

      return value;
    }),
  };

  let strategy: GoogleStrategy;

  beforeEach(() => {
    jest.clearAllMocks();

    strategy = new GoogleStrategy(
      authServiceMock as unknown as AuthService,
      configServiceMock as unknown as ConfigService,
    );
  });

  it('should normalize the Google email and resolve the application user', async () => {
    const user: UserModel = {
      id: 'user-id',
      email: 'user@gmail.com',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    authServiceMock.authenticateGoogle.mockResolvedValue(user);

    const profile = {
      id: 'google-subject-123',
      emails: [
        {
          value: ' USER@GMAIL.COM ',
        },
      ],
    } as Profile;

    const result = await strategy.validate('', '', profile);

    expect(authServiceMock.authenticateGoogle).toHaveBeenCalledWith({
      providerUserId: 'google-subject-123',
      email: 'user@gmail.com',
    });

    expect(result).toBe(user);
  });

  it('should reject a Google profile without an email', async () => {
    const profile = {
      id: 'google-subject-123',
      emails: [],
    } as unknown as Profile;

    await expect(strategy.validate('', '', profile)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(authServiceMock.authenticateGoogle).not.toHaveBeenCalled();
  });

  it('should reject a Google profile without a provider user id', async () => {
    const profile = {
      id: '',
      emails: [
        {
          value: 'user@gmail.com',
        },
      ],
    } as unknown as Profile;

    await expect(strategy.validate('', '', profile)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(authServiceMock.authenticateGoogle).not.toHaveBeenCalled();
  });
});
