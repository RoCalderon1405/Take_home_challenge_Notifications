import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Initial notification channels required by the application.
 *
 * The channel code is the stable identifier used by the application,
 * while the database-generated ID remains an internal persistence detail.
 */
const notificationChannels = [
  {
    code: 'EMAIL',
    name: 'Email',
  },
  {
    code: 'SMS',
    name: 'SMS',
  },
  {
    code: 'PUSH',
    name: 'Push',
  },
] as const;

/**
 * Creates the Prisma client used exclusively by the database seed process.
 */
const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the database seed.');
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({
    adapter,
  });
};

const prisma = createPrismaClient();

/**
 * Seeds application reference data.
 *
 * Upsert makes this process idempotent: the seed can be executed multiple
 * times without creating duplicate notification channels.
 */
async function main(): Promise<void> {
  for (const channel of notificationChannels) {
    await prisma.notificationChannel.upsert({
      where: {
        code: channel.code,
      },
      update: {
        name: channel.name,
        isActive: true,
      },
      create: {
        code: channel.code,
        name: channel.name,
        isActive: true,
      },
    });
  }

  console.log('Notification channels seeded successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
