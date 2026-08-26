import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';
import { CreateUserDto } from './request/create-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserResponseDto } from './response';
import { UserMapper } from './mappers/userMapper';
import { UserAuthModel } from './models';

@Injectable()
export class UsersService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _passwordHasherService: PasswordHaserService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { password, email } = createUserDto;

    const passwordHash = await this._passwordHasherService.hash(password);

    try {
      const userCreated = await this._prismaService.user.create({
        data: {
          email,
          passwordHash,
        },
        omit: { passwordHash: true },
      });

      return UserMapper.toResponse(userCreated);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`User with email: ${email} already exists`);
      }

      throw error;
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this._prismaService.user.findMany({
      omit: { passwordHash: true },
    });

    return users.map((user) => UserMapper.toResponse(user));
  }

  async findOneById(id: string): Promise<UserResponseDto> {
    const user = await this._prismaService.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }

    return UserMapper.toResponse(user);
  }

  async findOneByEmailForAuth(email: string): Promise<UserAuthModel | null> {
    const user = await this._prismaService.user.findUnique({
      where: { email },
    });

    return user;
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
