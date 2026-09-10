# Backend — Notifications API

NestJS notification API with authentication, owner-scoped CRUD and asynchronous delivery through BullMQ.

Global prefix: `/api`. Swagger: `/api/docs`.

## Stack

- NestJS 11 + TypeScript
- Prisma 7 + PostgreSQL
- Redis for cache and BullMQ
- Passport Local + JWT, Argon2 and roles `USER` / `ADMIN`
- Swagger
- Jest unit and E2E tests
- Real provider adapters: Resend (Email), Twilio (SMS), Firebase Cloud Messaging HTTP v1 (Push)

## Notification delivery architecture

The notification domain does not depend directly on external vendors.

```text
NotificationDeliveryService
        ↓
NotificationDispatcherService
        ↓
NotificationSenderRegistry
        ↓
NotificationSenderStrategy
        ├── EmailSenderStrategy → EmailProvider
        │                         ├── ConsoleEmailProvider
        │                         └── ResendEmailProvider
        ├── SmsSenderStrategy   → SmsProvider
        │                         ├── ConsoleSmsProvider
        │                         └── TwilioSmsProvider
        └── PushSenderStrategy  → PushProvider
                                  ├── ConsolePushProvider
                                  └── FirebasePushProvider
```

A strategy represents the **channel** (`EMAIL`, `SMS`, `PUSH`). A provider represents the **delivery infrastructure** used by that channel. Provider interfaces are compile-time TypeScript contracts; `Symbol` tokens such as `EMAIL_PROVIDER` are the runtime Nest dependency-injection keys.

This separation allows a provider to be replaced without changing the queue, dispatcher, delivery orchestration or controller.

## Provider modes

Console providers are the default and are intended for development and automated tests. The previous `EMAIL_PROVIDER=development` value is accepted as a backward-compatible alias for `console`. They exercise the complete queue/delivery/persistence flow without external credentials or billable traffic.

```env
EMAIL_PROVIDER=console
SMS_PROVIDER=console
PUSH_PROVIDER=console
```

To enable real delivery, select the provider explicitly and configure its credentials.

### Email — Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Notifications <notifications@your-domain.com>
```

`ResendEmailProvider` uses the official `resend` Node.js package.

### SMS — Twilio

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567
```

`TwilioSmsProvider` calls Twilio's Messaging REST API. The notification recipient should be an E.164 phone number.

### Push — Firebase Cloud Messaging

```env
PUSH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FirebasePushProvider` uses Firebase Cloud Messaging HTTP v1. It signs a service-account JWT, exchanges it for a short-lived OAuth 2.0 access token and caches that token until shortly before expiration. The notification recipient is an FCM registration token.

See `.env.providers.example` for a provider-only template.

## Configuration validation

Provider credentials are conditional:

- Console mode does not require external credentials.
- `EMAIL_PROVIDER=resend` requires `RESEND_API_KEY` and `EMAIL_FROM`.
- `SMS_PROVIDER=twilio` requires the Twilio SID, auth token and sender number.
- `PUSH_PROVIDER=firebase` requires project ID, service-account email and private key.

Invalid real-provider configuration prevents the application from starting instead of silently falling back to a fake delivery mechanism.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Login, JWT and `/auth/me` |
| `users` | Registration and admin user operations |
| `notifications` | Owner-scoped CRUD and send endpoint |
| `notifications/queue` | BullMQ producer and processor |
| `notifications/senders/strategies` | Channel selection |
| `notifications/senders/providers` | External provider adapters |
| `common/authorization` | RBAC / `RolesGuard` |
| `common/security` | Password hashing |

## Environment variables

The application currently loads the repo-root `.env` (`../.env` from this directory).

Core variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port |
| `ALLOWED_ORIGINS` | CORS origins |
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis connection |
| `PASSWORD_PEPPER` | Password pepper (minimum 32 chars) |
| `JWT_SECRET` | JWT signing secret (minimum 32 chars) |
| `JWT_EXPIRES_IN_SECONDS` | Access-token TTL |

Provider variables are documented in the Provider modes section above.

## Local setup

From the repository root, start PostgreSQL and Redis. Then from this backend directory:

```bash
npm ci
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

With the root Docker Compose setup, the backend can be built and run in its container instead.

## Scripts

```bash
npm run start:dev
npm run build
npm run lint:check
npm run test:unit
npm run test:cov
npm run test:e2e
```

## Main endpoints

Bearer authentication is required except registration and login.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users` | Register |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Current authenticated user |
| `POST` | `/api/notifications` | Create notification |
| `GET` | `/api/notifications` | List owned notifications |
| `GET` | `/api/notifications/:id` | Owned notification detail |
| `PATCH` | `/api/notifications/:id` | Update owned notification |
| `POST` | `/api/notifications/:id/send` | Queue asynchronous delivery |
| `DELETE` | `/api/notifications/:id` | Delete owned notification |

Example notification:

```json
{
  "channel": "EMAIL",
  "title": "Welcome",
  "content": "Hello from Notifications",
  "recipient": "destination@example.com"
}
```

`channel` can be `EMAIL`, `SMS` or `PUSH`. Ownership and delivery state are controlled by the backend.

## Asynchronous delivery

1. `POST /api/notifications/:id/send` verifies ownership and enqueues the job.
2. BullMQ stores and processes the job through Redis.
3. `NotificationDeliveryService` creates a delivery attempt and marks the notification `PROCESSING`.
4. The dispatcher resolves the channel strategy.
5. The strategy delegates to the configured provider.
6. Successful sends persist `SENT`, provider details and `sentAt`.
7. Provider failures persist `FAILED` and are rethrown so BullMQ can apply its retry policy.

Delivery attempts are persisted independently from the current notification state.

## Tests

Unit tests cover notification orchestration, queues, provider contracts, provider adapters and configuration validation. External-provider unit tests mock network calls; they do not send real Email/SMS/Push messages.

E2E tests use console providers so CI can verify the real HTTP → authentication → queue → Redis → worker → PostgreSQL flow without external credentials.

```bash
npm run test:unit
npm run test:e2e
```

To manually verify physical delivery, select one real provider in `.env`, restart the backend, create a notification for that channel and call its `/send` endpoint.
