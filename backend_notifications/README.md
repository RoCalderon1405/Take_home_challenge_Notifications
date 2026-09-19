# Notifications · Backend

**NestJS + Prisma + PostgreSQL + Redis / BullMQ** — authenticated notification management and asynchronous delivery.

[Project overview](../README.md) · [Live Swagger](https://notifications-api-karp.onrender.com/api/docs) · [Frontend guide](../frontend_notifications/README.md) · [Coveralls](https://coveralls.io/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main)

---

## Run the complete challenge

Use the [root startup script](../README.md#run-locally-with-one-script) for the default evaluation environment. Docker installs the dependencies, generates Prisma Client, applies migrations, seeds demo data and starts all four services.

| Environment | API base | Swagger |
| --- | --- | --- |
| Local Docker | `http://localhost:3000/api` | [Local Swagger](http://localhost:3000/api/docs) |
| Render | `https://notifications-api-karp.onrender.com/api` | [Hosted Swagger](https://notifications-api-karp.onrender.com/api/docs) |

> **Hosted cold start:** the Render free backend may take **50 seconds or more** to wake after inactivity. Open Swagger, wait for it to respond, then use the frontend. The domain root is not the Swagger page.

## Architecture and modules

| Module / path | Responsibility |
| --- | --- |
| `modules/auth` | Local credentials, Google provider integration, JWT and current user |
| `modules/users` | User registration, roles and external identity mapping |
| `modules/prisma` | Prisma lifecycle and PostgreSQL connection |
| `modules/notifications` | Owner-scoped CRUD and delivery orchestration |
| `notifications/queue` | BullMQ producer and processor |
| `notifications/senders/strategies` | Channel-specific behavior |
| `notifications/senders/providers` | Console, Resend, Twilio and Firebase adapters |
| `notifications/delivery-tracking` | Delivery attempts and event history |
| `notifications/webhooks` | Signed Resend and Twilio callbacks |
| `common/security` | Password hashing with Argon2 and a pepper |
| `common/authorization` | Role-based access control (`USER` / `ADMIN`) |
| `config` | Environment validation and Swagger setup |

Application models and response DTOs establish boundaries around persistence and HTTP contracts. Strategies select channels; provider adapters contain vendor-specific calls. The BullMQ worker runs within this NestJS application; the current Compose setup has no separate worker container.

### Delivery lifecycle

1. `POST /api/notifications` persists an owned notification and queues its first delivery.
2. BullMQ stores the job in Redis and invokes the worker.
3. Delivery orchestration creates an attempt and marks processing state.
4. The dispatcher selects the channel strategy and configured provider.
5. Provider acceptance records `SENT`, provider details and timestamps.
6. Resend/Twilio webhooks can record later delivery or failure events.
7. Provider errors are recorded and rethrown for the queue's retry handling.

`POST /api/notifications/:id/send` queues another explicit attempt. Attempts are stored separately from the notification's current state. `SENT` is provider acceptance, not proof that a person received/read the message. Console providers simulate acceptance locally and do not deliver externally.

## Authentication

### Local credentials

Register with `POST /api/users`, then authenticate through `POST /api/auth/login`. Use the returned `accessToken` as `Authorization: Bearer <token>`. Swagger's **Authorize** button accepts this token. `GET /api/auth/me` returns the current user. Ownership and authorization are enforced on the backend.

### Google OAuth 2.0

The backend has `/api/auth/google` and `/api/auth/google/callback`, Google profile mapping and state validation. When enabled, the callback currently returns the same token/user JSON used by local login.

**The browser handoff remains pending.** The frontend callback expects a session, but this backend extracts JWTs from Bearer headers and does not establish that cookie session. Enabling flags alone does not complete browser login. Keep Google disabled for the default challenge evaluation; complete and test the handoff as a separate step.

## Configuration

The existing backend and Prisma CLI load the repository root `.env` via `../.env` from the backend directory. Docker injects that root file through Compose. On Render, use service environment variables. This update preserves that layout.

| Variable | Purpose |
| --- | --- |
| `PORT` | API listening port; local default `3000` |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PASSWORD_PEPPER` | Password pepper, minimum 32 characters |
| `JWT_SECRET` | JWT signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN_SECONDS` | Positive token lifetime in seconds |
| `PUBLIC_API_BASE_URL` | Externally reachable API origin for provider callbacks |
| `GOOGLE_OAUTH_ENABLED` | `false` in the local demo |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Required when Google OAuth is enabled |
| `GOOGLE_CALLBACK_URL` | Exact backend callback URL registered with Google |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | Optional local demo account created by the seed |
| `DEMO_SEED_DATA` | `true` creates the fixed sample notification records |

External-provider credentials are conditional. Invalid selected-provider configuration prevents startup instead of silently substituting a console provider. The committed `.env.example` contains development defaults; its demo credentials and example secrets are for local evaluation only.

### Provider configuration

| Channel | Default | Real provider | Required variables for real provider |
| --- | --- | --- | --- |
| Email | `EMAIL_PROVIDER=console` | `resend` | `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` |
| SMS | `SMS_PROVIDER=console` | `twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_FROM_NUMBER`, `TWILIO_AUTH_TOKEN`, `PUBLIC_API_BASE_URL` |
| Push | `PUSH_PROVIDER=console` | `firebase` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |

Credential-free local mode:

```dotenv
EMAIL_PROVIDER=console
SMS_PROVIDER=console
PUSH_PROVIDER=console
GOOGLE_OAUTH_ENABLED=false
```

Firebase private-key format accepted by the provider:

```dotenv
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The provider converts literal `\n` sequences to actual line breaks. It obtains and caches a short-lived Google access token and sends via Firebase Cloud Messaging HTTP v1. **This project's payload targets `fid`**, and the frontend's **Use this browser** returns that Firebase Installation ID. Keep both sides aligned instead of substituting another identifier type without changing the contract.

Resend requires a suitable sender identity. Twilio trial restrictions can limit recipients and delivery volume. Browser push additionally needs matching public frontend Firebase configuration and notification permission. Backend credentials alone do not configure the browser.

## HTTP endpoints

All paths include the `/api` prefix. Protected endpoints require Bearer authentication; resource operations are owner-scoped.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/users` | Register a user |
| `POST` | `/api/auth/login` | Authenticate with email/password |
| `GET` | `/api/auth/google` | Begin Google provider login, when enabled |
| `GET` | `/api/auth/google/callback` | Return application token/user after Google authentication |
| `GET` | `/api/auth/me` | Retrieve current user |
| `POST` | `/api/notifications` | Create and queue the first delivery |
| `GET` | `/api/notifications` | Paginated, filtered and sorted list |
| `GET` | `/api/notifications/dashboard` | Dashboard summary |
| `GET` | `/api/notifications/:id` | Notification detail |
| `GET` | `/api/notifications/:id/deliveries` | Delivery history |
| `PATCH` | `/api/notifications/:id` | Edit notification |
| `POST` | `/api/notifications/:id/send` | Queue another delivery attempt |
| `DELETE` | `/api/notifications/:id` | Delete notification |

Example creation body:

```json
{
  "channel": "EMAIL",
  "title": "Welcome",
  "content": "Hello from Notifications",
  "recipient": "destination@example.com"
}
```

Channels: `EMAIL`, `SMS`, `PUSH`. The server controls ownership and delivery state.

Example list request:

```text
GET /api/notifications?page=1&pageSize=20&sortBy=createdAt&sortDirection=desc&status=SENT&channel=EMAIL&search=welcome
```

Pagination is one-based; `pageSize` defaults to 20 and is capped at 100. Search covers title, content and recipient. Responses contain `items` and pagination metadata.

### Provider webhooks

| Method | Path | Verification |
| --- | --- | --- |
| `POST` | `/api/webhooks/resend` | Resend signing secret |
| `POST` | `/api/webhooks/twilio/status` | Twilio signature and configured public URL |

These provider-to-server endpoints remain intentionally excluded from Swagger. Keep the public URL used by the provider aligned with backend validation, including when using a local tunnel.

## Develop the backend outside Docker

Use Node.js 24 and npm. From the repository root, create `.env` from `.env.example` if needed, then start only the data services:

```bash
docker compose up -d db redis
```

For a host-run backend, change these root `.env` connections to `localhost`; the Compose service names `db` and `redis` only resolve inside the container network:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notifications
REDIS_URL=redis://localhost:6379
```

Stop any Docker backend before using its port locally:

```bash
docker compose stop backend frontend
```

Then, from `backend_notifications/`:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

`migrate deploy` applies the committed migrations. Use `migrate dev` only when intentionally developing new schema migrations. When returning to Docker, Compose supplies container-network database/Redis URLs.

## Tests and build

Run commands from this backend directory. Prisma Client must be generated first.

```bash
npm run lint:check
npm run test:unit
npm run test:cov
npm run build
```

End-to-end tests require PostgreSQL, Redis, migrations and test environment configuration. They exercise HTTP authentication, persistence and asynchronous delivery with console providers.

```bash
npm run test:e2e
```

`test/setup-e2e-env.ts` and the CI workflows define the test environment. Use a dedicated test database; do not point end-to-end tests at production data. Unit provider tests mock remote calls and do not send real messages.

### Continuous integration and coverage

- GitHub Actions: `../.github/workflows/main.yml` — lint, unit tests, end-to-end tests and build.
- CircleCI: `../.circleci/config.yml` — equivalent validation plus coverage upload.
- [Coveralls](https://coveralls.io/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main) — uploaded backend coverage. The badge reflects the external report, not a locally invented percentage.

## Swagger and Compodoc

Swagger is served by the API at `/api/docs`. Compodoc is generated separately from source and comments:

```bash
npm run docs
npm run docs:serve
```

Output: `documentation/`. Local documentation server: [localhost:8080](http://localhost:8080). The output is ignored by Git and Docker; source comments and `tsconfig.doc.json` remain versioned. `tsconfig.build.json` excludes generated documentation from application compilation.

**Public Compodoc URL: pending.** Publish the generated output as a separate Render Static Site using the [step-by-step guide](../docs/compodoc-render.md). It does not require database or provider credentials.

## Render configuration notes

The backend is already hosted at [notifications-api-karp.onrender.com](https://notifications-api-karp.onrender.com). Keep production secrets in Render's environment settings. Configure `ALLOWED_ORIGINS` to include `https://notifications-frontend.onrender.com`; set the public API origin and Google callback to the deployed host when enabling those integrations.

The supplied Dockerfile targets local development and runs watch mode. These docs do not replace or claim to inspect the existing Render build/start settings. Use the existing service configuration until the deployment workflow is reviewed explicitly.
