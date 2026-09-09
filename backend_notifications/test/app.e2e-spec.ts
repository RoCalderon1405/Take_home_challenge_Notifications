import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@app/app.module';
import { configureApp } from '@app/config/app.config';
import { PrismaService } from '@app/modules/prisma/prisma.service';

interface CreateUserResponse {
  id: string;
  email: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
}

interface CurrentUserResponse {
  id: string;
  email: string;
}

describe('Authentication flow (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const testEmail = `e2e-${Date.now()}@example.com`;

  const testPassword = 'E2ePassword!2026';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);

    prismaService = app.get(PrismaService);

    configureApp(app, configService);

    await app.init();
  });

  afterAll(async () => {
    await prismaService.user.deleteMany({
      where: {
        email: testEmail,
      },
    });

    await app.close();
  });

  it('should register, login and access the authenticated profile', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(201);

    const createdUser = createResponse.body as CreateUserResponse;

    expect(createdUser.id).toBeDefined();
    expect(createdUser.email).toBe(testEmail);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(201);

    const login = loginResponse.body as LoginResponse;

    expect(login.accessToken).toBeDefined();
    expect(typeof login.accessToken).toBe('string');

    expect(login.user.id).toBe(createdUser.id);

    expect(login.user.email).toBe(testEmail);

    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .expect(200);

    const profile = profileResponse.body as CurrentUserResponse;

    expect(profile.id).toBe(createdUser.id);

    expect(profile.email).toBe(testEmail);
  });

  it('should reject access to the profile without a JWT', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
