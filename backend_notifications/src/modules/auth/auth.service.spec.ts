import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { UsersService } from '../users/users.service';
import { UserModel, UserStatus } from '../users/models';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findOneByEmailForAuth: jest.fn(),
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

  it('should validate correct credentials', async () => {
    // Arrange
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

    // Act
    const result = await service.validateCredentials(loginDto);

    // Assert
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    expect(passwordHasherServiceMock.verify).toHaveBeenCalledWith(
      loginDto.password,
      user.passwordHash,
    );
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    // Arrange
    const loginDto = {
      email: 'missing@example.com',
      password: 'my-secure-password',
    };

    usersServiceMock.findOneByEmailForAuth.mockResolvedValue(null);

    // Act + Assert
    await expect(service.validateCredentials(loginDto)).rejects.toThrow(
      'Invalid credentials',
    );

    expect(passwordHasherServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    // Arrange
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

    // Act + Assert
    await expect(service.validateCredentials(loginDto)).rejects.toThrow(
      'Invalid credentials',
    );

    expect(passwordHasherServiceMock.verify).toHaveBeenCalledWith(
      loginDto.password,
      user.passwordHash,
    );
  });

  it('should generate an access token for an authenticated user', async () => {
    // Arrange
    const user: UserModel = {
      id: 'user-id',
      email: 'user@example.com',
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jwtServiceMock.signAsync.mockResolvedValue('jwt-access-token');

    // Act
    const result = await service.login(user);

    // Assert
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
