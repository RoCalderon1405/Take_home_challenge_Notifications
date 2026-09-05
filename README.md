# Notifications Platform

Messaging take-home: each authenticated user can create, list, update, and send **their own** notifications over email, SMS, or push.

The project is **not finished**. The backend covers authentication, per-user notification CRUD, and asynchronous delivery (queue). The frontend is still the Vite/React starter.

## Purpose

- JWT authentication and user registration.
- Users can only see and change their own messages.
- Delivery is decoupled from the HTTP request (BullMQ + Redis).
- API practices: validation, ownership in persistence, Swagger, tests, and CI.

## Current status

| Area | Status |
| --- | --- |
| Auth (JWT login, registration, ADMIN roles) | Implemented |
| Per-user notification CRUD | Implemented |
| Queued asynchronous delivery | In progress (simulated providers) |
| Delivery attempt history | Persisted in the backend |
| Messaging UI | Pending (Vite template) |
| Real providers (SendGrid, Twilio, FCM, etc.) | Pending |

## Architecture

```
Client (React / Vite)      NestJS API              Redis              PostgreSQL
        │                       │                    │                     │
        ├── POST /api/auth/login ──► JWT             │                     │
        ├── CRUD /api/notifications ─────────────────┼─────────────────────┤
        └── POST /api/notifications/:id/send         │                     │
                              │                      │                     │
                              └── BullMQ job ────────┤                     │
                                    worker ────────────────────────────────┤
```

Monorepo:

- `backend_notifications/` — NestJS 11 API, Prisma 7, Passport JWT, BullMQ.
- `frontend_notifications/` — React + Vite SPA (not wired to the API yet).
- `docker-compose.yml` — PostgreSQL 17, Redis 8, backend, and frontend.

## Requirements

- Node.js 24
- Docker Desktop (recommended) or local PostgreSQL 17 + Redis 8
- npm

## Quick start

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   Set `JWT_SECRET` and `PASSWORD_PEPPER` (at least 32 characters).

2. Start infrastructure and services:

   ```bash
   docker compose up --build
   ```

3. Apply migrations and seed (from `backend_notifications/`):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. Default URLs:

   - API: `http://localhost:3000/api`
   - Swagger: `http://localhost:3000/api/docs`
   - Frontend: `http://localhost:5173`

Scripts, endpoints, and data model: [backend_notifications/README.md](./backend_notifications/README.md).

## Messaging flow

1. `POST /api/users` — register.
2. `POST /api/auth/login` — receive an `accessToken`.
3. `POST /api/notifications` — create a `PENDING` message owned by the authenticated user.
4. `GET` / `PATCH` / `DELETE /api/notifications` — list, update, or delete **owned resources only**.
5. `POST /api/notifications/:id/send` — returns `202 Accepted` and enqueues delivery. The worker updates status (`PROCESSING` → `SENT` or `FAILED`) and records the attempt.

## Security (current design)

- `userId` never comes from the request body; it is taken from the JWT.
- Notification queries filter by `id` + `userId`. A resource owned by someone else is treated as `404`.
- Passwords use Argon2 plus a pepper.
- Global validation (`whitelist` + `forbidNonWhitelisted`).
- CORS is limited by `ALLOWED_ORIGINS`.

## CI

CircleCI runs lint, unit tests, build, and coverage (Coveralls) for the backend.

## Next steps (not implemented)

- UI: login, inbox, edit, and send.
- Document `POST /:id/send` in Swagger.
- Queue retries, backoff, and idempotency.
- Real EMAIL / SMS / PUSH providers.
- List pagination and rate limiting.
- Docker healthcheck on a public endpoint (it currently hits an authenticated notifications route).
