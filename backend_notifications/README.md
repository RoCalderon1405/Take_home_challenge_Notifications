# Backend — Notifications API

NestJS notification API with authentication, owner-scoped CRUD and asynchronous delivery through BullMQ.

Global prefix: `/api`. Swagger: `/api/docs`.

## Stack

- NestJS 11 + TypeScript
- Prisma 7 + PostgreSQL
- Redis for cache and BullMQ
- Passport Local + Google OAuth 2.0 + JWT, Argon2 and roles `USER` / `ADMIN`
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

## Authentication modes

The backend supports both local credentials and Google OAuth 2.0. Both flows end by issuing the same application JWT, so protected endpoints do not need to know which login method was used.

### Local credentials

`POST /api/auth/login` validates email/password through Passport Local and returns the application JWT.

### Google OAuth 2.0

Google login is optional and disabled by default. Enable it only after creating OAuth credentials in Google Cloud:

```env
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

The callback URL must exactly match an **Authorized redirect URI** configured for the Google OAuth client.

Flow:

```text
GET /api/auth/google
        ↓
Google login / consent
        ↓
GET /api/auth/google/callback
        ↓
GoogleStrategy
        ↓
AuthService.authenticateGoogle
        ↓
UsersService.findOrCreateByExternalIdentity
        ↓
existing identity → existing user
existing email    → link Google identity
new email         → create OAuth-only user
        ↓
AuthService.login
        ↓
application JWT
```

Google access and refresh tokens are not persisted because this project uses Google only for authentication. The redirect flow uses a short-lived, HMAC-signed `state` value to protect the OAuth round trip without introducing server-side HTTP sessions. External identities are stored separately in `user_identities`, which keeps the user model ready for additional providers without adding provider-specific columns to `users`.

OAuth-only users have a nullable `password_hash`; local login rejects those accounts unless a local password is added in a future account-management flow.

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
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

`ResendEmailProvider` uses the official `resend` Node.js package. Delivery events are verified with `RESEND_WEBHOOK_SECRET` at `/api/webhooks/resend` and persisted in the delivery timeline.

### SMS — Twilio

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567
PUBLIC_API_BASE_URL=https://api.example.com
```

`TwilioSmsProvider` uses Twilio's official Node.js SDK with API Key authentication. Every SMS includes a `StatusCallback` pointing to `${PUBLIC_API_BASE_URL}/api/webhooks/twilio/status`; callbacks are validated with `TWILIO_AUTH_TOKEN`. The notification recipient should be an E.164 phone number.

### Push — Firebase Cloud Messaging

```env
PUSH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FirebasePushProvider` uses Firebase Cloud Messaging HTTP v1. It signs a service-account JWT, exchanges it for a short-lived OAuth 2.0 access token and caches that token until shortly before expiration. The notification recipient is an FCM registration token.

See `.env.providers.example` for notification-provider and Google OAuth integration variables.

## Configuration validation

External integration credentials are conditional:

- `GOOGLE_OAUTH_ENABLED=false` does not require Google credentials.
- `GOOGLE_OAUTH_ENABLED=true` requires the Google client id, client secret and callback URL.
- Console notification mode does not require external provider credentials.
- `EMAIL_PROVIDER=resend` requires `RESEND_API_KEY`, `EMAIL_FROM` and `RESEND_WEBHOOK_SECRET`.
- `SMS_PROVIDER=twilio` requires the Account SID, API Key SID/Secret, primary Auth Token, sender number and `PUBLIC_API_BASE_URL`.
- `PUSH_PROVIDER=firebase` requires project ID, service-account email and private key.

Invalid real-provider configuration prevents the application from starting instead of silently falling back to a fake delivery mechanism.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Local login, Google OAuth 2.0, JWT and `/auth/me` |
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
| `GOOGLE_OAUTH_ENABLED` | Enables/disables Google login (`false` by default) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Backend callback registered in Google Cloud |

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
npm run docs
npm run docs:serve
```

`npm run docs` generates Compodoc output under `documentation/`. The generated directory is intentionally ignored by Git and Docker; the source JSDoc and Compodoc configuration remain versioned.

## Main endpoints

Bearer authentication is required except registration and authentication entry points.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users` | Register |
| `POST` | `/api/auth/login` | Local email/password login |
| `GET` | `/api/auth/google` | Start Google OAuth login |
| `GET` | `/api/auth/google/callback` | Google OAuth callback; returns application JWT |
| `GET` | `/api/auth/me` | Current authenticated user |
| `POST` | `/api/notifications` | Create notification and automatically queue its first delivery |
| `GET` | `/api/notifications` | Paginated owner-scoped notifications with search, filters and sorting |
| `GET` | `/api/notifications/:id` | Owned notification detail |
| `PATCH` | `/api/notifications/:id` | Update owned notification |
| `POST` | `/api/notifications/:id/send` | Explicitly queue/retry an owned notification |
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

The notification list endpoint supports server-side pagination, sorting and filters:

```text
GET /api/notifications?page=1&pageSize=20&sortBy=createdAt&sortDirection=desc&status=SENT&channel=EMAIL&search=welcome
```

`page` is one-based, `pageSize` defaults to `20` and is capped at `100`. Search is case-insensitive over `title`, `content` and `recipient`. The response contains `items` plus pagination metadata (`page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage`).

### Provider callback endpoints

Provider callbacks are intentionally excluded from Swagger because they are signed machine-to-machine endpoints rather than frontend-facing API operations.

| Method | Path | Provider | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/webhooks/resend` | Resend | Receive and verify email delivery events |
| `POST` | `/api/webhooks/twilio/status` | Twilio | Receive and verify SMS status callbacks |

## Asynchronous delivery

1. `POST /api/notifications` persists the notification and immediately enqueues its first delivery job.
2. BullMQ stores and processes the job through Redis.
3. `NotificationDeliveryService` creates a delivery attempt and marks the notification `PROCESSING`.
4. The dispatcher resolves the channel strategy.
5. The strategy delegates to the configured provider.
6. Successful provider acceptance persists `SENT`, provider details and `sentAt`.
7. Resend/Twilio webhooks can later advance tracked deliveries to `DELIVERED` or `FAILED`.
8. Provider failures persist `FAILED` and are rethrown so BullMQ can apply its retry policy.

`POST /api/notifications/:id/send` remains available as an explicit owner-scoped queue/retry operation. Delivery attempts are persisted independently from the current notification state.

## Tests

Unit tests cover notification orchestration, queues, provider contracts, provider adapters and configuration validation. External-provider unit tests mock network calls; they do not send real Email/SMS/Push messages.

E2E tests use console providers so CI can verify the real HTTP → authentication → queue → Redis → worker → PostgreSQL flow without external credentials.

```bash
npm run test:unit
npm run test:e2e
```

To manually verify physical delivery, select one real provider in `.env`, restart the backend and create a notification for that channel. Creation automatically queues the first delivery; `/send` remains available for an explicit retry.
