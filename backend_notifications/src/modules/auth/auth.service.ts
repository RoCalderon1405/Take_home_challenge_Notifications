import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {

  constructor(private readonly _prismaService: PrismaService) {}

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  async signIn(username: string, password:string): Promise<any> {
    // const user = await
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
