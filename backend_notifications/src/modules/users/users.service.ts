import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';
import { CreateUserDto } from './request/create-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UserResponseDto } from './response';

@Injectable()
export class UsersService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _passwordHasherService: PasswordHaserService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password, email } = createUserDto;

    const passwordHashed = await this._passwordHasherService.hash(password);

    try {
      const userCreated = await this._prismaService.user.create({
        data: {
          email,
          passwordHash: passwordHashed,
        },
        omit: { passwordHash: true },
      });

      return userCreated;
    } catch (error: PrismaClientKnownRequestError | any) {
      if (error.code === 'P2002') {
        throw new Error(`User with email: ${email} already exists`);
      }
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async findAll() {
    const users = await this._prismaService.user.findMany({
      omit: { passwordHash: true },
    });

    return users;
  }

  async findOneById(id: string) {
    const user = await this._prismaService.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }
    return user;
  }

  async findOneByEmailForAuth(email: string) {
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
