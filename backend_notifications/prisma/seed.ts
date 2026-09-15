import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { createHmac } from 'node:crypto';

import { PrismaClient } from '../src/generated/prisma/client';

const notificationChannels = [
  { code: 'EMAIL', name: 'Email' },
  { code: 'SMS', name: 'SMS' },
  { code: 'PUSH', name: 'Push' },
] as const;

const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the database seed.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
};

const prisma = createPrismaClient();

async function hashPassword(password: string, pepper: string): Promise<string> {
  const pepperedPassword = createHmac('sha256', pepper)
    .update(password, 'utf8')
    .digest('base64url');

  return argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
  });
}

async function seedChannels(): Promise<Map<string, number>> {
  const channelIds = new Map<string, number>();

  for (const channel of notificationChannels) {
    const persisted = await prisma.notificationChannel.upsert({
      where: { code: channel.code },
      update: { name: channel.name, isActive: true },
      create: { code: channel.code, name: channel.name, isActive: true },
    });

    channelIds.set(channel.code, persisted.id);
  }

  return channelIds;
}

function getChannelId(channelIds: Map<string, number>, code: string): number {
  const id = channelIds.get(code);

  if (!id) {
    throw new Error(`Notification channel ${code} was not seeded.`);
  }

  return id;
}

async function seedDemoUser(channelIds: Map<string, number>): Promise<void> {
  const email = process.env.DEMO_USER_EMAIL?.trim();
  const password = process.env.DEMO_USER_PASSWORD;
  const shouldSeedDemoData = process.env.DEMO_SEED_DATA === 'true';

  if (!email && !password) {
    console.log('Demo user seed skipped.');
    return;
  }

  if (!email || !password) {
    throw new Error(
      'DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be provided together.',
    );
  }

  const pepper = process.env.PASSWORD_PEPPER;

  if (!pepper) {
    throw new Error('PASSWORD_PEPPER is required to seed the demo user.');
  }

  const passwordHash = await hashPassword(password, pepper);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: 'ACTIVE',
      role: 'USER',
    },
    create: {
      email,
      passwordHash,
      status: 'ACTIVE',
      role: 'USER',
    },
  });

  if (!shouldSeedDemoData) {
    console.log(`Demo user seeded successfully: ${email}`);
    return;
  }

  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const demoNotifications = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      channelId: getChannelId(channelIds, 'EMAIL'),
      title: 'Welcome to Notifications',
      content: 'This delivered email is sample data created by the seed.',
      recipient: email,
      status: 'DELIVERED' as const,
      lastError: null,
      sentAt: new Date(now - 4 * hour),
      deliveredAt: new Date(now - 4 * hour + 60_000),
      createdAt: new Date(now - 4 * hour - 60_000),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      channelId: getChannelId(channelIds, 'SMS'),
      title: 'SMS sample',
      content: 'This failed SMS demonstrates provider error visibility.',
      recipient: '+15555550100',
      status: 'FAILED' as const,
      lastError: 'Demo provider failure',
      sentAt: new Date(now - 3 * hour),
      deliveredAt: null,
      createdAt: new Date(now - 3 * hour - 60_000),
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      channelId: getChannelId(channelIds, 'PUSH'),
      title: 'Push sample',
      content: 'This push notification is sample data and was not sent externally.',
      recipient: 'demo-device-token',
      status: 'SENT' as const,
      lastError: null,
      sentAt: new Date(now - 2 * hour),
      deliveredAt: null,
      createdAt: new Date(now - 2 * hour - 60_000),
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      channelId: getChannelId(channelIds, 'EMAIL'),
      title: 'Pending sample',
      content: 'This pending notification keeps the demo dashboard representative.',
      recipient: email,
      status: 'PENDING' as const,
      lastError: null,
      sentAt: null,
      deliveredAt: null,
      createdAt: new Date(now - hour),
    },
  ];

  for (const notification of demoNotifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {
        userId: user.id,
        channelId: notification.channelId,
        title: notification.title,
        content: notification.content,
        recipient: notification.recipient,
        status: notification.status,
        lastError: notification.lastError,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        createdAt: notification.createdAt,
      },
      create: {
        ...notification,
        userId: user.id,
      },
    });
  }

  console.log(`Demo user and sample notifications seeded: ${email}`);
}

async function main(): Promise<void> {
  const channelIds = await seedChannels();

  await seedDemoUser(channelIds);

  console.log('Database seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
