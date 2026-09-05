# Notifications Platform

Plataforma de mensajería (take-home) para que cada usuario autenticado cree, consulte, actualice y envíe **sus propias notificaciones** por correo, SMS o push.

El proyecto **aún no está terminado**. El backend cubre autenticación, CRUD de notificaciones con aislamiento por usuario y entrega asíncrona (cola). El frontend sigue en plantilla Vite/React.

## Propósito

- Autenticación con JWT y registro de usuarios.
- Cada usuario solo ve y modifica sus mensajes.
- Envío desacoplado del request HTTP (BullMQ + Redis).
- Buenas prácticas de API: validación, ownership en persistencia, Swagger, tests y CI.

## Estado actual

| Área | Estado |
| --- | --- |
| Auth (login JWT, registro, roles ADMIN) | Implementado |
| CRUD de notificaciones por usuario | Implementado |
| Encolado y entrega asíncrona | En progreso (proveedores simulados) |
| Historial de intentos de entrega | Persistido en backend |
| Frontend de mensajería | Pendiente (plantilla Vite) |
| Proveedores reales (SendGrid, Twilio, FCM, etc.) | Pendiente |

## Arquitectura

```
Cliente (React / Vite)     API NestJS              Redis              PostgreSQL
        │                       │                    │                     │
        ├── POST /api/auth/login ──► JWT             │                     │
        ├── CRUD /api/notifications ─────────────────┼─────────────────────┤
        └── POST /api/notifications/:id/send         │                     │
                              │                      │                     │
                              └── BullMQ job ────────┤                     │
                                    worker ────────────────────────────────┤
```

Monorepo:

- `backend_notifications/` — API NestJS 11, Prisma 7, Passport JWT, BullMQ.
- `frontend_notifications/` — SPA React + Vite (aún no integrada con la API).
- `docker-compose.yml` — PostgreSQL 17, Redis 8, backend y frontend.

## Requisitos

- Node.js 24
- Docker Desktop (recomendado) o PostgreSQL 17 + Redis 8 locales
- npm

## Arranque rápido

1. Copiar variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Ajusta `JWT_SECRET` y `PASSWORD_PEPPER` (mínimo 32 caracteres).

2. Levantar infraestructura y servicios:

   ```bash
   docker compose up --build
   ```

3. Aplicar migraciones y seed (desde `backend_notifications/`):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. URLs por defecto:

   - API: `http://localhost:3000/api`
   - Swagger: `http://localhost:3000/api/docs`
   - Frontend: `http://localhost:5173`

Detalle de scripts, endpoints y modelo de datos: [backend_notifications/README.md](./backend_notifications/README.md).

## Flujo de mensajería

1. `POST /api/users` — registro.
2. `POST /api/auth/login` — obtiene `accessToken`.
3. `POST /api/notifications` — crea un mensaje `PENDING` del usuario autenticado.
4. `GET` / `PATCH` / `DELETE /api/notifications` — listar, actualizar o borrar **solo lo propio**.
5. `POST /api/notifications/:id/send` — responde `202 Accepted` y encola el envío. El worker actualiza estado (`PROCESSING` → `SENT` o `FAILED`) y registra el intento.

## Seguridad (diseño actual)

- El `userId` nunca viene del body: se toma del JWT.
- Las consultas de notificaciones filtran por `id` + `userId`. Un recurso ajeno se trata como `404`.
- Contraseñas con Argon2 y pepper.
- Validación global (`whitelist` + `forbidNonWhitelisted`).
- CORS restringido por `ALLOWED_ORIGINS`.

## CI

CircleCI ejecuta lint, tests unitarios, build y cobertura (Coveralls) sobre el backend.

## Próximos pasos (no implementados)

- UI: login, bandeja de mensajes, edición y disparo de envío.
- Documentar `POST /:id/send` en Swagger.
- Reintentos, backoff e idempotencia en la cola.
- Integración con proveedores reales de EMAIL / SMS / PUSH.
- Paginación de listados y rate limiting.
- Healthcheck de Docker alineado con un endpoint público (hoy apunta a una ruta de notificaciones autenticada).
