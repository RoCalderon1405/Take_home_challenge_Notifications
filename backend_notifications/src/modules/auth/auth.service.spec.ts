import { Test, TestingModule } from '@nestjs/testing';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/models';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findOneByEmailForAuth: jest.fn(),
  };

  const passwordHasherServiceMock = {
    verify: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should validate correct credentials', async () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'my-secure-password',
    };

    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'stored-password-hash',
      status: UserStatus.ACTIVE,
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    const loginDto = {
      email: 'missing@example.com',
      password: 'my-secure-password',
    };

    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(null);

    await expect(service.validateCredentials(loginDto)).rejects.toThrow(
      'Invalid credentials',
    );

    expect(passwordHasherServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'wrong-password',
    };

    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'stored-password-hash',
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(user);
    passwordHasherServiceMock.verify.mockResolvedValue(false);

    await expect(service.validateCredentials(loginDto)).rejects.toThrow(
      'Invalid credentials',
    );

    expect(passwordHasherServiceMock.verify).toHaveBeenCalledWith(
      loginDto.password,
      user.passwordHash,
    );
  });
});
