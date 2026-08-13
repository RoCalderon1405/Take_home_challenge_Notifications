import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@app/generated/prisma/client';
import { UserCreateInput, UserModel } from '@app/generated/prisma/models';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _passwordHasherService: PasswordHaserService,
  ) {}

  async create(createUserDto: UserCreateInput) {
    const { email, passwordHash, ...userData } = createUserDto;

    const passwordHashed = await this._passwordHasherService.hash(passwordHash);

    try {
      const userCreated = await this._prismaService.user.create({
        data: {
          email: createUserDto.email.trim().toLowerCase(),
          passwordHash,
          ...userData,
        },
      });
      return userCreated;
    } catch (error: unknown) {
      const message = error instanceof Prisma.PrismaClientKnownRequestError;
      throw new Error(`Error creating user: ${message}`);
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOne(id: Prisma.UserWhereUniqueInput): Promise<UserModel> {
    const user = await this._prismaService.user.findUnique({
      where: id,
    });

    if (!user) {
      throw new Error(`User with id: ${id} not found`);
    }
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
