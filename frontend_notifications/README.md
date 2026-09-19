# Notifications · Frontend

**React + TypeScript + Vite** — the user interface for the Notifications take-home challenge.

[Project overview](../README.md) · [Live application](https://notifications-frontend.onrender.com) · [Backend contract](../backend_notifications/README.md) · [Swagger](https://notifications-api-karp.onrender.com/api/docs)

---

## Start here

To evaluate the complete application, use the [one-script Docker setup](../README.md#run-locally-with-one-script). It starts the frontend, backend, PostgreSQL and Redis together. This guide covers the frontend internals and independent development.

> The hosted API runs on Render's free tier. After inactivity, initialization can take **50 seconds or more**. Open [Swagger](https://notifications-api-karp.onrender.com/api/docs), wait for it to load, then sign in. The current API client has a 10-second timeout, so its first request can time out while the backend wakes up.

## Stack and responsibilities

| Tool | Responsibility |
| --- | --- |
| React / TypeScript | Components and typed application models |
| Vite | Development server and production bundle |
| Material UI | Layouts, forms, navigation and feedback |
| React Router | Page routing and protected routes |
| Redux Toolkit | Authenticated-user and preference state |
| TanStack Query | API queries, mutations and cached server data |
| Axios | HTTP client, authentication headers and normalized errors |
| React Hook Form / Zod | Form state and validation |
| react-i18next | English and Spanish translations |
| Firebase Messaging | Browser registration and incoming push messages |
| Vitest / Testing Library / MSW | Unit/component tests and request mocks |

## Folder guide

| Path | Responsibility |
| --- | --- |
| `src/app/providers/` | Theme, authentication bootstrap and foreground push listener |
| `src/app/router/` | Route definitions and `ProtectedRoute` |
| `src/app/store/` | Redux store, auth and preferences slices |
| `src/config/env.ts` | Validated public runtime/build configuration |
| `src/core/api/` | Axios instance, response error handling |
| `src/core/auth/` | Access-token storage |
| `src/features/auth/` | Login, callback page, DTOs, mapper and API calls |
| `src/features/notifications/` | CRUD pages, forms, filters, models and queries |
| `src/features/dashboard/` | Summary and recent-notification views |
| `src/layouts/` | Authenticated shell, sidebar, header and login layout |
| `src/shared/components/` | Reusable buttons, loading states, dialogs and chips |
| `src/i18n/` / `src/theme/` | Translations and theme configuration |
| `src/lib/firebase.ts` | Firebase registration and foreground display |
| `public/firebase-messaging-sw.js` | Background push service worker |
| `src/test/` | Test setup and mock server |

## Pages and navigation

| Route | Page | Access |
| --- | --- | --- |
| `/login` | Email/password login | Public |
| `/auth/callback` | Google completion page; integration pending | Public |
| `/dashboard` | Summary and recent notifications | Authenticated |
| `/notifications` | Searchable, paginated notification list | Authenticated |
| `/notifications/new` | Create notification | Authenticated |
| `/notifications/:id` | Detail and delivery attempts | Authenticated |
| `/notifications/:id/edit` | Edit notification | Authenticated |

The sidebar selects **New notification** only for its creation page. The list, detail and edit pages select **Notifications**. Source-code and GitHub profile links open in a separate tab.

## Develop the frontend outside Docker

Install Node.js 24 and npm. Keep the API, PostgreSQL and Redis running. From the repository root, after `.env` has been created:

```bash
docker compose up -d --build --wait db redis backend
```

If the Docker frontend is already running, release its port first:

```bash
docker compose stop frontend
```

From this directory, install dependencies and create the public frontend configuration.

```bash
npm ci
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Then start Vite:

```bash
npm run dev
```

Open [localhost:5173](http://localhost:5173). If this port is occupied, Vite may select a different one; the backend CORS configuration must then allow that origin. Vite does not automatically load the repository parent's `.env`.

## Public environment variables

| Variable | Local value / purpose |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api`; includes the API prefix |
| `VITE_AUTH_TRANSPORT` | `bearer`; matches the current backend |
| `VITE_GOOGLE_OAUTH_ENABLED` | `false` for the local challenge evaluation |
| `VITE_FIREBASE_API_KEY` | Firebase web configuration, only for real push |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender identifier |
| `VITE_FIREBASE_APP_ID` | Firebase web app identifier |
| `VITE_FIREBASE_VAPID_KEY` | Public Web Push key |

`VITE_*` values are exposed to the browser. Backend secrets, private keys and provider API tokens do not belong here. With Docker, Compose injects these variables; with a production Vite build, configure them **before** running the build and rebuild when changing them.

## How the frontend works

### Email/password authentication

1. `LoginPage` validates the form and calls `authApi.login()`.
2. The API returns an access token and user data.
3. `tokenStorage` stores the token for Bearer mode; `userMapper` maps the response to the frontend model.
4. Redux receives the authenticated user, and the router opens `/dashboard`.
5. The Axios request interceptor adds the Bearer header. `AuthBootstrap` restores the user through `/auth/me`; a `401` clears authentication.

### Notifications

Pages call hooks in `notification.queries.ts`. These use the notification API module and mapper, separating HTTP DTOs from UI models. Creation queues the first delivery on the backend. **Send again** requests another attempt; it is not a scheduling feature. The detail page shows attempts and recorded delivery events.

### Browser push

For real push, the backend must use the Firebase provider and the web configuration must match its project. The current `public/firebase-messaging-sw.js` contains project-specific public values; keep those aligned with the `VITE_FIREBASE_*` values when using another project.

- **Use this browser** requests notification permission and obtains the Firebase Installation ID used as recipient by this implementation.
- In the foreground, `listenForForegroundMessages()` notifies React and asks the registered worker to show an operating-system notification.
- `PushForegroundListener` also displays an in-app snackbar.
- In the background, Firebase and the service worker handle the incoming message.
- The default `console` provider does not send browser push. HTTPS is needed in deployment; localhost is used for development.

The foreground and background paths were manually exercised during development. There is no guarantee of instant delivery, and operating-system notification settings still apply.

## Google OAuth: current status

**Backend integration exists; the complete browser login flow is not finished.**

The current frontend redirects to `/api/auth/google`. The backend's Google callback returns JSON with the application token. Meanwhile, `GoogleCallbackPage` expects to retrieve an existing session using `/auth/me`, and the backend currently extracts JWTs only from the Bearer header. Selecting `cookie` in the frontend does not implement server-side cookie authentication.

The Google button is disabled in Bearer mode and hidden in the default Docker setup. Keep it disabled for the basic evaluation. The next OAuth step is to agree on and implement the token/session handoff, then test login, callback, reload, logout and error/cancel paths. Do not describe Google browser login as validated until this is complete.

## Commands

Run from `frontend_notifications/`.

**Development**

```bash
npm run dev
```

**Tests and lint**

```bash
npm run test
npm run test:coverage
npm run lint
```

**Production bundle and local preview**

```bash
npm run build
npm run preview
```

The production output is `dist/`. `preview` serves the built frontend locally; it does not start the backend or deploy to Render.

## Render deployment

The existing frontend is published at [notifications-frontend.onrender.com](https://notifications-frontend.onrender.com).

For a Render Static Site using this repository:

| Setting | Value |
| --- | --- |
| Root directory | `frontend_notifications` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| `VITE_API_URL` | `https://notifications-api-karp.onrender.com/api` |
| `VITE_AUTH_TRANSPORT` | `bearer` |
| `VITE_GOOGLE_OAUTH_ENABLED` | `false` until the browser handoff is completed |

Configure a rewrite from `/*` to `/index.html` so direct navigation and refresh work for React Router routes. The backend's `ALLOWED_ORIGINS` must include the frontend origin. These are reproduction instructions, not a claim that the Render dashboard was inspected.
