import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PasswordHaserService } from '@app/common/security/password-hasher.service';

import { PrismaService } from '../prisma/prisma.service';

import { UserMapper } from './mappers/userMapper';
import { UserAuthModel, UserModel } from './models';
import { CreateUserDto } from './request/create-user.dto';
import { UserResponseDto } from './response';
import { PrismaErrorCode, PrismaErrorHandler } from '@app/common/database';

/**
 * Provides user-related application operations.
 *
 * This service coordinates user persistence through Prisma and delegates
 * password hashing to the security layer.
 *
 * Sensitive authentication data is exposed only through methods explicitly
 * intended for authentication flows.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _passwordHasherService: PasswordHaserService,
  ) {}

  /**
   * Creates a new user account.
   *
   * The plain-text password is hashed before persistence and is never
   * returned as part of the created user response.
   *
   * @param createUserDto Data required to create the user.
   * @returns The newly created user without sensitive authentication data.
   * @throws ConflictException When another user already uses the same email.
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
   * Retrieves all users.
   *
   * Authentication secrets are excluded directly at the persistence
   * query level so they do not propagate through the application.
   *
   * @returns All users represented as public response DTOs.
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
   *
   * Sensitive authentication data is excluded from the query so the
   * returned model can safely be reused by other application components,
   * including JWT authentication.
   *
   * @param id Unique user identifier.
   * @returns The application user model.
   * @throws NotFoundException When the user does not exist.
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
   * Finds a user by email for credential validation.
   *
   * Unlike regular user queries, this method intentionally includes the
   * password hash because it is required by the authentication flow to
   * verify the submitted password.
   *
   * The password hash must not be exposed by controllers or API responses.
   *
   * @param email Email used to identify the account.
   * @returns The authentication user model, or null when no user exists.
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

    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * Deletes a user by its unique identifier.
   *
   * @param id User UUID.
   * @throws NotFoundException When the user does not exist.
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
