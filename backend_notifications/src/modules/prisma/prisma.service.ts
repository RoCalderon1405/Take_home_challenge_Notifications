import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Envs } from '../../config/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Prisma Service');

  constructor() {
    const adapter = new PrismaPg({
      connectionString: Envs.DATABASE_URL as string,
    });

    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();

      this.logger.log('Database connected successfully.');
    } catch (error) {
      await this.$disconnect();

      this.logger.error(error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();

    this.logger.error('Database disconnected successfully.');
  }
}
