# Backend — Notifications API

API NestJS para mensajería: autenticación, usuarios y notificaciones **aisladas por propietario**. El envío se procesa de forma asíncrona con BullMQ.

Este servicio **no está cerrado**: los canales EMAIL / SMS / PUSH simulan un proveedor. Falta pulir cola (reintentos, Swagger del send) y no hay cliente de producción.

Prefijo global: `/api`. Swagger: `/api/docs`.

## Stack

- NestJS 11, TypeScript
- Prisma 7 + PostgreSQL
- Redis: caché (`@nestjs/cache-manager`) y colas (`@nestjs/bullmq`)
- Auth: Passport Local + JWT, Argon2, roles `USER` / `ADMIN`
- Validación: `class-validator` + `ValidationPipe`
- Documentación: Swagger
- Tests: Jest (unitarios en `*.spec.ts`)

## Módulos

| Módulo | Responsabilidad |
| --- | --- |
| `auth` | Login, JWT, `/auth/me` |
| `users` | Registro público; listado/borrado solo `ADMIN` |
| `notifications` | CRUD propio + `POST :id/send` |
| `notifications/queue` | Producer HTTP → job; Processor → `NotificationDeliveryService` |
| `notifications/senders` | Strategy por canal (`EMAIL`, `SMS`, `PUSH`) |
| `common/authorization` | `RolesGuard` |
| `common/security` | Hash de contraseñas |

Ownership: el controlador inyecta el usuario de Passport; el servicio filtra siempre por `userId` en Prisma.

## Requisitos

- Node.js 24
- Variables en el `.env` de la **raíz del repo** (`../.env` respecto a este directorio)
- PostgreSQL y Redis (vía `docker compose` en la raíz)

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP |
| `ALLOWED_ORIGINS` | Orígenes CORS (lista separada por comas) |
| `DATABASE_URL` | Conexión PostgreSQL |
| `REDIS_URL` | Redis (caché y BullMQ) |
| `PASSWORD_PEPPER` | Pepper de hashing (≥ 32 caracteres) |
| `JWT_SECRET` | Firma JWT (≥ 32 caracteres) |
| `JWT_EXPIRES_IN_SECONDS` | TTL del access token |

Plantilla: [../.env.example](../.env.example).

## Setup local (sin Docker del API)

Desde la raíz:

```bash
cp .env.example .env
docker compose up db redis -d
```

En este directorio:

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

Prisma usa `prisma.config.ts` (schema en `prisma/`, seed `prisma/seed.ts`).

## Endpoints

Autenticación Bearer (`Authorization: Bearer <token>`) salvo registro y login.

### Auth y usuarios

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/users` | Pública | Registro |
| `POST` | `/api/auth/login` | Local (email/password) | Access token |
| `GET` | `/api/auth/me` | JWT | Usuario actual |
| `GET` | `/api/users` | JWT + ADMIN | Listar usuarios |
| `GET` | `/api/users/:id` | JWT + ADMIN | Obtener usuario |
| `DELETE` | `/api/users/:id` | JWT + ADMIN | Borrar usuario |

Login (body): `{ "email": "user@example.com", "password": "..." }`.

### Notificaciones (siempre del usuario del token)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/notifications` | Crea mensaje `PENDING` |
| `GET` | `/api/notifications` | Lista propias (más recientes primero) |
| `GET` | `/api/notifications/:id` | Detalle propio |
| `PATCH` | `/api/notifications/:id` | Actualiza campos permitidos |
| `POST` | `/api/notifications/:id/send` | Encola envío (`202`, `{ status, jobId }`) |
| `DELETE` | `/api/notifications/:id` | Elimina propia |

Crear:

```json
{
  "channel": "EMAIL",
  "title": "Bienvenida",
  "content": "Hola",
  "recipient": "destino@example.com"
}
```

`channel`: `EMAIL` | `SMS` | `PUSH`. El cliente no envía `userId`, `status` ni IDs internos de canal.

Si el id no existe o es de otro usuario: `404` (sin filtrar existencia ajena).

## Modelo de datos (resumen)

- `User` — email único, `passwordHash`, `status`, `role`.
- `Notification` — título, contenido, destinatario, canal, `status` (`PENDING` / `PROCESSING` / `SENT` / `FAILED`), `sentAt`, `lastError`.
- `NotificationChannel` — catálogo (`EMAIL`, `SMS`, `PUSH`).
- `NotificationDelivery` — intento de envío (payload, proveedor, error).

Índices por `userId`, estado y `userId + createdAt`.

## Entrega asíncrona

1. `POST :id/send` añade un job `send-notification` a la cola `notifications`.
2. El processor llama a `NotificationDeliveryService.send(userId, notificationId)`.
3. Se crea un registro de delivery `PROCESSING`, se llama a la strategy del canal y se persiste `SENT` o `FAILED` en transacción.

Los senders actuales son stubs de desarrollo (`development-email`, etc.). Sustituir la strategy no debe cambiar el orquestador.

## Docker

El `docker-compose` de la raíz construye este servicio, espera Postgres y Redis sanos, y monta `prisma/` para generar cliente. Healthcheck HTTP: revisar que apunte a una ruta pública cuando se endurezca el compose.

## Tests

Los tests de controlador mockean `NotificationQueueProducer` para no cargar BullMQ/ESM ni Redis.

```bash
npm run test:unit
```

CI (CircleCI) corre lint, unit tests, build y cobertura sobre este paquete.

## Deuda conocida (backend)

- Sin decorator Swagger en `POST :id/send`.
- Encolar no valida ownership antes del job (el worker sí; jobs inválidos fallan en el worker).
- Sin política explícita de retries/backoff en BullMQ.
- Senders no hablan con un proveedor real.
- Listados sin paginación.
