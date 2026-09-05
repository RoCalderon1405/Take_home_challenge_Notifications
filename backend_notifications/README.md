# Backend — Notifications API

NestJS messaging API: authentication, users, and **owner-scoped** notifications. Delivery runs asynchronously with BullMQ.

This service is **not complete**: EMAIL / SMS / PUSH channels simulate a provider. Queue hardening (retries, Swagger for send) and a production client are still missing.

Global prefix: `/api`. Swagger: `/api/docs`.

## Stack

- NestJS 11, TypeScript
- Prisma 7 + PostgreSQL
- Redis: cache (`@nestjs/cache-manager`) and queues (`@nestjs/bullmq`)
- Auth: Passport Local + JWT, Argon2, roles `USER` / `ADMIN`
- Validation: `class-validator` + `ValidationPipe`
- Docs: Swagger
- Tests: Jest (`*.spec.ts`)

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Login, JWT, `/auth/me` |
| `users` | Public registration; list/delete is `ADMIN` only |
| `notifications` | Owner CRUD + `POST :id/send` |
| `notifications/queue` | HTTP producer → job; processor → `NotificationDeliveryService` |
| `notifications/senders` | Per-channel strategy (`EMAIL`, `SMS`, `PUSH`) |
| `common/authorization` | `RolesGuard` |
| `common/security` | Password hashing |

Ownership: the controller injects the Passport user; the service always filters by `userId` in Prisma.

## Requirements

- Node.js 24
- Env vars in the **repo root** `.env` (`../.env` from this directory)
- PostgreSQL and Redis (via root `docker compose`)

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis (cache and BullMQ) |
| `PASSWORD_PEPPER` | Hashing pepper (≥ 32 characters) |
| `JWT_SECRET` | JWT signing secret (≥ 32 characters) |
| `JWT_EXPIRES_IN_SECONDS` | Access-token TTL |

Template: [../.env.example](../.env.example).

## Local setup (API not in Docker)

From the repo root:

```bash
cp .env.example .env
docker compose up db redis -d
```

In this directory:

```bash
npm ci
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

## Scripts

```bash
npm run start:dev    # watch
npm run build
npm run start:prod
npm run lint:check
npm run test:unit
npm run test:cov
npm run test:e2e
```

Prisma uses `prisma.config.ts` (schema in `prisma/`, seed `prisma/seed.ts`).

## Endpoints

Bearer auth (`Authorization: Bearer <token>`) except registration and login.

### Auth and users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/users` | Public | Register |
| `POST` | `/api/auth/login` | Local (email/password) | Access token |
| `GET` | `/api/auth/me` | JWT | Current user |
| `GET` | `/api/users` | JWT + ADMIN | List users |
| `GET` | `/api/users/:id` | JWT + ADMIN | Get user |
| `DELETE` | `/api/users/:id` | JWT + ADMIN | Delete user |

Login body: `{ "email": "user@example.com", "password": "..." }`.

### Notifications (always scoped to the token user)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/notifications` | Create a `PENDING` message |
| `GET` | `/api/notifications` | List owned (newest first) |
| `GET` | `/api/notifications/:id` | Owned detail |
| `PATCH` | `/api/notifications/:id` | Update allowed fields |
| `POST` | `/api/notifications/:id/send` | Enqueue send (`202`, `{ status, jobId }`) |
| `DELETE` | `/api/notifications/:id` | Delete owned |

Create:

```json
{
  "channel": "EMAIL",
  "title": "Welcome",
  "content": "Hello",
  "recipient": "destination@example.com"
}
```

`channel`: `EMAIL` | `SMS` | `PUSH`. Clients do not send `userId`, `status`, or internal channel IDs.

If the id is missing or belongs to another user: `404` (no existence leak).

## Data model (summary)

- `User` — unique email, `passwordHash`, `status`, `role`.
- `Notification` — title, content, recipient, channel, `status` (`PENDING` / `PROCESSING` / `SENT` / `FAILED`), `sentAt`, `lastError`.
- `NotificationChannel` — catalog (`EMAIL`, `SMS`, `PUSH`).
- `NotificationDelivery` — send attempt (payload, provider, error).

Indexes on `userId`, status, and `userId + createdAt`.

## Asynchronous delivery

1. `POST :id/send` adds a `send-notification` job to the `notifications` queue.
2. The processor calls `NotificationDeliveryService.send(userId, notificationId)`.
3. A `PROCESSING` delivery row is created, the channel strategy runs, and `SENT` or `FAILED` is persisted in a transaction.

Current senders are development stubs (`development-email`, etc.). Replacing a strategy should not change the orchestrator.

## Docker

Root `docker-compose` builds this service, waits for healthy Postgres and Redis, and mounts `prisma/` for client generation. HTTP healthcheck: point it at a public route when hardening compose.

## Tests

Controller tests mock `NotificationQueueProducer` so Jest does not load BullMQ/ESM or Redis.

```bash
npm run test:unit
```

CI (CircleCI) runs lint, unit tests, build, and coverage for this package.

## Known gaps (backend)

- No Swagger decorator on `POST :id/send`.
- Enqueue does not check ownership before the job (the worker does; invalid jobs fail there).
- No explicit BullMQ retry/backoff policy.
- Senders do not call a real provider.
- Lists are not paginated.
