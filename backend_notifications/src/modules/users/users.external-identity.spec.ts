import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { PrismaService } from '../prisma/prisma.service';

import { UserAuthProvider, UserRole, UserStatus } from './models';
import { UsersService } from './users.service';

describe('UsersService external identities', () => {
  const safeUser = {
    id: 'user-id',
    email: 'user@gmail.com',
    status: UserStatus.ACTIVE,
    role: UserRole.USER,
    createdAt: new Date('2026-09-12T00:00:00.000Z'),
    updatedAt: new Date('2026-09-12T00:00:00.000Z'),
  };

  const transactionMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userIdentity: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    userIdentity: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const passwordHasherMock = {
    hash: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (transaction: typeof transactionMock) => Promise<unknown>,
      ) => callback(transactionMock),
    );

    service = new UsersService(
      prismaMock as unknown as PrismaService,
      passwordHasherMock as unknown as PasswordHaserService,
    );
  });

  it('should reuse a user when the Google identity already exists', async () => {
    prismaMock.userIdentity.findUnique.mockResolvedValue({
      id: 'identity-id',
      user: safeUser,
    });

    const result = await service.findOrCreateByExternalIdentity({
      provider: UserAuthProvider.GOOGLE,
      providerUserId: 'google-123',
      email: 'user@gmail.com',
    });

    expect(result).toEqual(safeUser);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('should link Google to an existing local user with the same email', async () => {
    prismaMock.userIdentity.findUnique.mockResolvedValue(null);
    transactionMock.user.findUnique.mockResolvedValue(safeUser);
    transactionMock.userIdentity.create.mockResolvedValue({});

    const result = await service.findOrCreateByExternalIdentity({
      provider: UserAuthProvider.GOOGLE,
      providerUserId: 'google-123',
      email: 'USER@GMAIL.COM',
    });

    expect(transactionMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: 'user@gmail.com',
        },
      }),
    );

    expect(transactionMock.userIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: safeUser.id,
        provider: UserAuthProvider.GOOGLE,
        providerUserId: 'google-123',
      },
    });

    expect(result).toEqual(safeUser);
  });

  it('should create an OAuth-only user when no account exists', async () => {
    prismaMock.userIdentity.findUnique.mockResolvedValue(null);
    transactionMock.user.findUnique.mockResolvedValue(null);
    transactionMock.user.create.mockResolvedValue(safeUser);

    const result = await service.findOrCreateByExternalIdentity({
      provider: UserAuthProvider.GOOGLE,
      providerUserId: 'google-123',
      email: 'user@gmail.com',
    });

    expect(transactionMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'user@gmail.com',
        passwordHash: null,
        identities: {
          create: {
            provider: UserAuthProvider.GOOGLE,
            providerUserId: 'google-123',
          },
        },
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    expect(result).toEqual(safeUser);
  });
});
