import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from './models';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersController unit tests do not test Passport authentication.
 *
 * Mocking JwtAuthGuard keeps this suite isolated from Passport's
 * runtime implementation and module format.
 */
jest.mock('../auth/guards', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneById: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * Verifies that user creation is delegated to UsersService
   * with the received registration data.
   */
  it('should create a user', async () => {
    // Arrange
    const createUserDto = {
      email: 'test@gmail.com',
      password: 'my-secure-password',
    };

    const createdAt = new Date();
    const updatedAt = new Date();

    const createdUser = {
      id: 'b149fdc6-f049-4e9a-8af6-ca4e5106e9a4',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    };

    usersServiceMock.create.mockResolvedValue(createdUser);

    // Act
    const result = await controller.create(createUserDto);

    // Assert
    expect(usersServiceMock.create).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(createdUser);
  });

  /**
   * Verifies that retrieval of all users is delegated to UsersService.
   */
  it('should return all users', async () => {
    // Arrange
    const createdAt = new Date();
    const updatedAt = new Date();

    const users = [
      {
        id: 'b149fdc6-f049-4e9a-8af6-ca4e5106e9a4',
        email: 'user1@gmail.com',
        status: 'ACTIVE',
        role: UserRole.USER,
        createdAt,
        updatedAt,
      },
      {
        id: '58cc4650-91e7-46aa-823c-2e5d74b50c4a',
        email: 'admin@gmail.com',
        status: 'ACTIVE',
        role: UserRole.ADMIN,
        createdAt,
        updatedAt,
      },
    ];

    usersServiceMock.findAll.mockResolvedValue(users);

    // Act
    const result = await controller.findAll();

    // Assert
    expect(usersServiceMock.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(users);
  });

  /**
   * Verifies that retrieval of a single user is delegated to UsersService
   * using the provided UUID.
   */
  it('should return a user by id', async () => {
    // Arrange
    const userId = 'b149fdc6-f049-4e9a-8af6-ca4e5106e9a4';
    const createdAt = new Date();
    const updatedAt = new Date();

    const user = {
      id: userId,
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    };

    usersServiceMock.findOneById.mockResolvedValue(user);

    // Act
    const result = await controller.findOne(userId);

    // Assert
    expect(usersServiceMock.findOneById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(user);
  });

  /**
   * Verifies that user deletion is delegated to UsersService
   * using the provided UUID.
   */
  it('should delete a user by id', async () => {
    // Arrange
    const userId = 'b149fdc6-f049-4e9a-8af6-ca4e5106e9a4';

    usersServiceMock.remove.mockResolvedValue(undefined);

    // Act
    const result = await controller.remove(userId);

    // Assert
    expect(usersServiceMock.remove).toHaveBeenCalledWith(userId);
    expect(result).toBeUndefined();
  });
});
