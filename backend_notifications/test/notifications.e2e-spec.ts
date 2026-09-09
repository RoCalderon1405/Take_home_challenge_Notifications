import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@app/app.module';
import { configureApp } from '@app/config/app.config';
import { PrismaService } from '@app/modules/prisma/prisma.service';

interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
}

interface NotificationResponse {
  id: string;
  channel: string;
  title: string;
  content: string;
  recipient: string;
  status: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueuedResponse {
  status: 'QUEUED';
  jobId?: string;
}

describe('Notifications flow (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  let userAToken: string;
  let userBToken: string;

  let notificationId: string;

  const uniqueSuffix = Date.now();

  const userAEmail = `notifications-a-${uniqueSuffix}@example.com`;

  const userBEmail = `notifications-b-${uniqueSuffix}@example.com`;

  const password = 'E2ePassword!2026';

  const registerAndLogin = async (email: string): Promise<string> => {
    await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const login = loginResponse.body as LoginResponse;

    return login.accessToken;
  };

  const waitUntilNotificationIsSent = async (
    id: string,
    timeoutMs = 5_000,
  ): Promise<void> => {
    const timeoutAt = Date.now() + timeoutMs;

    while (Date.now() < timeoutAt) {
      const notification = await prismaService.notification.findUnique({
        where: {
          id,
        },
        select: {
          status: true,
        },
      });

      if (notification?.status === 'SENT') {
        return;
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });
    }

    throw new Error(`Notification ${id} was not sent within ${timeoutMs} ms`);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);

    prismaService = app.get(PrismaService);

    configureApp(app, configService);

    await app.init();

    userAToken = await registerAndLogin(userAEmail);

    userBToken = await registerAndLogin(userBEmail);
  });

  afterAll(async () => {
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [userAEmail, userBEmail],
        },
      },
    });

    await app.close();
  });

  it('should reject notification creation without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .send({
        channel: 'EMAIL',
        title: 'Unauthorized notification',
        content: 'This must not be created.',
        recipient: 'unauthorized@example.com',
      })
      .expect(401);
  });

  it('should allow user A to create a notification', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        channel: 'EMAIL',
        title: 'E2E notification',
        content: 'Notification created by user A.',
        recipient: 'recipient@example.com',
      })
      .expect(201);

    const notification = response.body as NotificationResponse;

    expect(notification.id).toBeDefined();

    expect(notification.channel).toBe('EMAIL');

    expect(notification.title).toBe('E2E notification');

    expect(notification.status).toBe('PENDING');

    notificationId = notification.id;
  });

  it('should return the notification to its owner', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const notification = response.body as NotificationResponse;

    expect(notification.id).toBe(notificationId);

    expect(notification.title).toBe('E2E notification');
  });

  it('should include the notification in user A list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const notifications = response.body as NotificationResponse[];

    expect(
      notifications.some((notification) => notification.id === notificationId),
    ).toBe(true);
  });

  it('should not expose user A notification in user B list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const notifications = response.body as NotificationResponse[];

    expect(
      notifications.some((notification) => notification.id === notificationId),
    ).toBe(false);
  });

  it('should return 404 when user B requests user A notification', async () => {
    await request(app.getHttpServer())
      .get(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('should prevent user B from sending user A notification', async () => {
    await request(app.getHttpServer())
      .post(`/api/notifications/${notificationId}/send`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('should queue and process user A notification', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/notifications/${notificationId}/send`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(202);

    const queued = response.body as QueuedResponse;

    expect(queued.status).toBe('QUEUED');

    expect(typeof queued.jobId).toBe('string');

    await waitUntilNotificationIsSent(notificationId);

    const persistedNotification = await prismaService.notification.findUnique({
      where: {
        id: notificationId,
      },
      select: {
        status: true,
        sentAt: true,
        lastError: true,
      },
    });

    expect(persistedNotification?.status).toBe('SENT');

    expect(persistedNotification?.sentAt).not.toBeNull();

    expect(persistedNotification?.lastError).toBeNull();

    const delivery = await prismaService.notificationDelivery.findFirst({
      where: {
        notificationId,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      select: {
        attemptNumber: true,
        status: true,
        provider: true,
        completedAt: true,
      },
    });

    expect(delivery).not.toBeNull();

    expect(delivery?.attemptNumber).toBe(1);

    expect(delivery?.status).toBe('SENT');

    expect(delivery?.provider).toBeDefined();

    expect(delivery?.completedAt).not.toBeNull();
  });
});
