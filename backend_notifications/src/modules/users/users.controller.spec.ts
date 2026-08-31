import { Test, TestingModule } from '@nestjs/testing';

/**
 * UsersController unit tests do not test Passport authentication.
 * Mocking the authentication guard keeps this suite isolated from
 * Passport's runtime implementation and module format.
 */
jest.mock('../auth/guards', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

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
});
