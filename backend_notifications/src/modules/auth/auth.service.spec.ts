import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import {
  UserAuthProvider,
  UserRole,
  UserStatus,
  type UserModel,
} from '../users/models';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findOneByEmailForAuth: jest.fn(),
    findOrCreateByExternalIdentity: jest.fn(),
  };

  const passwordHasherServiceMock = {
    verify: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: PasswordHaserService,
          useValue: passwordHasherServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should validate correct local credentials', async () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'my-secure-password',
    };

    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'stored-password-hash',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(user);
    passwordHasherServiceMock.verify.mockResolvedValue(true);

    const result = await service.validateCredentials(loginDto);

    expect(result).toEqual({
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    expect(passwordHasherServiceMock.verify).toHaveBeenCalledWith(
      loginDto.password,
      user.passwordHash,
    );
  });

  it('should reject local login when the user does not exist', async () => {
    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(null);

    await expect(
      service.validateCredentials({
        email: 'missing@example.com',
        password: 'my-secure-password',
      }),
    ).rejects.toThrow('Invalid credentials');

    expect(passwordHasherServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should reject local login for an OAuth-only user without a password', async () => {
    usersServiceMock.findOneByEmailForAuth.mockResolvedValue({
      id: 'oauth-user',
      email: 'oauth@example.com',
      passwordHash: null,
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.validateCredentials({
        email: 'oauth@example.com',
        password: 'anything',
      }),
    ).rejects.toThrow('Invalid credentials');

    expect(passwordHasherServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should reject local login when password is invalid', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'stored-password-hash',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(user);
    passwordHasherServiceMock.verify.mockResolvedValue(false);

    await expect(
      service.validateCredentials({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should resolve a Google profile through UsersService', async () => {
    const user: UserModel = {
      id: 'google-user',
      email: 'user@gmail.com',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersServiceMock.findOrCreateByExternalIdentity.mockResolvedValue(user);

    const result = await service.authenticateGoogle({
      providerUserId: 'google-subject-123',
      email: 'user@gmail.com',
    });

    expect(
      usersServiceMock.findOrCreateByExternalIdentity,
    ).toHaveBeenCalledWith({
      provider: UserAuthProvider.GOOGLE,
      providerUserId: 'google-subject-123',
      email: 'user@gmail.com',
    });
    expect(result).toBe(user);
  });

  it('should reject Google login when the linked account is not active', async () => {
    const user: UserModel = {
      id: 'google-user',
      email: 'user@gmail.com',
      status: UserStatus.BANNED,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersServiceMock.findOrCreateByExternalIdentity.mockResolvedValue(user);

    await expect(
      service.authenticateGoogle({
        providerUserId: 'google-subject-123',
        email: 'user@gmail.com',
      }),
    ).rejects.toThrow('Account is not active');
  });

  it('should generate an access token for an authenticated user', async () => {
    const user: UserModel = {
      id: 'user-id',
      email: 'user@example.com',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jwtServiceMock.signAsync.mockResolvedValue('jwt-access-token');

    const result = await service.login(user);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });

    expect(result).toEqual({
      user,
      accessToken: 'jwt-access-token',
    });
  });
});
