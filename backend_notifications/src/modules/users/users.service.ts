import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  isPrismaKnownRequestError,
  PrismaErrorCode,
  PrismaErrorHandler,
} from '@app/common/database';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { PrismaService } from '../prisma/prisma.service';

import { UserMapper } from './mappers/userMapper';
import type { ExternalIdentityInput, UserAuthModel, UserModel } from './models';
import { CreateUserDto } from './request/create-user.dto';
import { UserResponseDto } from './response';

/**
 * Provides user-related application operations.
 *
 * This service coordinates user persistence through Prisma and delegates
 * password hashing to the security layer. It also owns the persistence rules
 * for external identities so AuthService does not depend on Prisma details.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _passwordHasherService: PasswordHaserService,
  ) {}

  /**
   * Creates a local user account with a password.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { password, email } = createUserDto;

    const passwordHash = await this._passwordHasherService.hash(password);

    try {
      const userCreated = await this._prismaService.user.create({
        data: {
          email,
          passwordHash,
        },
        omit: {
          passwordHash: true,
        },
      });

      return UserMapper.toResponse(userCreated);
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.UNIQUE_CONSTRAINT]: () =>
          new ConflictException(`User with email: ${email} already exists`),
      });
    }
  }

  /**
   * Retrieves all users without authentication secrets.
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this._prismaService.user.findMany({
      omit: {
        passwordHash: true,
      },
    });

    return users.map((user) => UserMapper.toResponse(user));
  }

  /**
   * Finds a user by its unique identifier.
   */
  async findOneById(id: string): Promise<UserModel> {
    const user = await this._prismaService.user.findUnique({
      where: {
        id,
      },
      omit: {
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }

    return UserMapper.toModel(user);
  }

  /**
   * Finds a user by email for local credential validation.
   *
   * OAuth-only users legitimately have a null passwordHash. AuthService is
   * responsible for treating that as invalid local credentials.
   */
  async findOneByEmailForAuth(email: string): Promise<UserAuthModel | null> {
    const user = await this._prismaService.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Resolves or creates a user from an external authentication identity.
   *
   * Resolution order:
   * 1. Reuse an existing provider identity when it already exists.
   * 2. Link the provider identity to an existing user with the same email.
   * 3. Otherwise create a new OAuth-only user and identity atomically.
   *
   * Provider access tokens are never persisted.
   */
  async findOrCreateByExternalIdentity(
    input: ExternalIdentityInput,
  ): Promise<UserModel> {
    const email = input.email.trim().toLowerCase();

    const existingIdentity = await this._prismaService.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: input.provider,
          providerUserId: input.providerUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (existingIdentity) {
      return UserMapper.toModel(existingIdentity.user);
    }

    try {
      const user = await this._prismaService.$transaction(
        async (transaction) => {
          const existingUser = await transaction.user.findUnique({
            where: {
              email,
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

          if (existingUser) {
            await transaction.userIdentity.create({
              data: {
                userId: existingUser.id,
                provider: input.provider,
                providerUserId: input.providerUserId,
              },
            });

            return existingUser;
          }

          return transaction.user.create({
            data: {
              email,
              passwordHash: null,
              identities: {
                create: {
                  provider: input.provider,
                  providerUserId: input.providerUserId,
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
        },
      );

      return UserMapper.toModel(user);
    } catch (error: unknown) {
      if (
        isPrismaKnownRequestError(error) &&
        error.code === PrismaErrorCode.UNIQUE_CONSTRAINT
      ) {
        /*
         * Two OAuth callbacks can arrive concurrently. If another request
         * created the same provider identity first, resolve it and continue
         * instead of turning a harmless race into a failed login.
         */
        const identity = await this._prismaService.userIdentity.findUnique({
          where: {
            provider_providerUserId: {
              provider: input.provider,
              providerUserId: input.providerUserId,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                status: true,
                role: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        if (identity) {
          return UserMapper.toModel(identity.user);
        }

        throw new ConflictException(
          'This external account cannot be linked to the selected user',
        );
      }

      throw error;
    }
  }

  /**
   * Deletes a user by its unique identifier.
   */
  async remove(id: string): Promise<void> {
    try {
      await this._prismaService.user.delete({
        where: {
          id,
        },
      });
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        [PrismaErrorCode.RECORD_NOT_FOUND]: () =>
          new NotFoundException(`User with id: ${id} not found`),
      });
    }
  }
}
