<div align="center">

<h1>🔔 Notifications Platform</h1>

<h2>Full-Stack Notification Management & Delivery System</h2>

<h3>Email · SMS · Push · Async Processing · Delivery Tracking</h3>

<a href="https://portfoliorocalderon.netlify.app/#experience">
  <img src="https://img.shields.io/badge/Get%20in%20Touch-Roberto%20Tonatiuh%20Calderon%20Aguilar-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Get in Touch" />
</a>

<br/><br/>

<a href="https://coveralls.io/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main">
  <img src="https://img.shields.io/coverallsCoverage/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main&style=for-the-badge&logo=coveralls&logoColor=white" alt="Coverage" />
</a>

<br/>

<img src="https://img.shields.io/badge/Backend-Ready-22C55E?style=for-the-badge" alt="Backend Ready" />
<img src="https://img.shields.io/badge/Frontend-Ready-22C55E?style=for-the-badge" alt="Frontend Ready" />
<img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Ready" />
<img src="https://img.shields.io/badge/Swagger-Available-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger Available" />

</div>

🚀 Getting Started with Docker

The recommended way to run the complete project is with Docker Compose.

You do not need to install PostgreSQL, Redis, Node.js, Prisma, NestJS CLI or Vite locally when using the Docker setup.

Pre-requisites 📋

Windows / macOS

Install:

Git

Docker Desktop

On Windows, Docker Desktop uses WSL 2 as the recommended backend.

After installation, open Docker Desktop and wait until Docker Engine is running.

Verify the installation:

docker --version
docker compose version
git --version

All three commands should return a valid version.

Linux

Install:

Git

Docker Engine

Docker Compose plugin

Then verify:

docker --version
docker compose version
git --version

Required Ports 🔌

The following ports must be available before starting the stack:

<table align="center" width="72%">
  <thead>
    <tr>
      <th>Port</th>
      <th>Service</th>
      <th>Required</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>3000</code></td><td>⚙️ NestJS REST API</td><td>✅ Yes</td></tr>
    <tr><td><code>5173</code></td><td>🌐 React / Vite Frontend</td><td>✅ Yes</td></tr>
    <tr><td><code>5432</code></td><td>🐘 PostgreSQL</td><td>✅ Yes</td></tr>
    <tr><td><code>6379</code></td><td>🔴 Redis</td><td>✅ Yes</td></tr>
    <tr><td><code>8080</code></td><td>📚 Compodoc</td><td>Only when serving docs</td></tr>
  </tbody>
</table>

Check ports on Windows

netstat -ano | findstr :3000
netstat -ano | findstr :5173
netstat -ano | findstr :5432
netstat -ano | findstr :6379

If a command returns no result, the port is normally available.

Check ports on Linux / macOS

lsof -i :3000
lsof -i :5173
lsof -i :5432
lsof -i :6379

Installation 🔧

<table align="center" width="92%">
  <tr>
    <td align="center" width="25%">
      <h1>1️⃣</h1>
      <strong>Clone</strong><br/><br/>
      Get the repository
    </td>
    <td align="center" width="25%">
      <h1>2️⃣</h1>
      <strong>Configure</strong><br/><br/>
      Create the environment file
    </td>
    <td align="center" width="25%">
      <h1>3️⃣</h1>
      <strong>Run</strong><br/><br/>
      Start the complete stack
    </td>
    <td align="center" width="25%">
      <h1>4️⃣</h1>
      <strong>Verify</strong><br/><br/>
      Confirm all services
    </td>
  </tr>
</table>

1️⃣ Clone the repository

git clone https://github.com/RoCalderon1405/Take_home_challenge_Notifications.git
cd Take_home_challenge_Notifications

2️⃣ Create the environment file

Windows CMD

copy .env.example .env

PowerShell

Copy-Item .env.example .env

Linux / macOS

cp .env.example .env

The default local configuration is designed to use console providers, so third-party credentials are not required for the basic evaluation flow.

3️⃣ Start the complete stack

docker compose up --build

On the first run Docker may take a few minutes while it downloads images and installs dependencies.

The Docker-ready startup flow is:

PostgreSQL + Healthcheck
│
▼
Redis + Healthcheck
│
▼
Prisma Client Generation
│
▼
Database Migrations
│
▼
Database Seed
│
▼
NestJS API
│
▼
React / Vite Frontend

4️⃣ Verify the services

Open another terminal from the repository root:

docker compose ps

You should see the application services running:

notifications-db
notifications-redis
notifications-backend
notifications-frontend

Application URLs 🌐

<table align="center" width="72%">
  <thead>
    <tr>
      <th>Service</th>
      <th>Address</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>🌐 <strong>Frontend</strong></td><td><code>http://localhost:5173</code></td></tr>
    <tr><td>⚙️ <strong>REST API</strong></td><td><code>http://localhost:3000/api</code></td></tr>
    <tr><td>📘 <strong>Swagger</strong></td><td><code>http://localhost:3000/api/docs</code></td></tr>
    <tr><td>🐘 <strong>PostgreSQL</strong></td><td><code>localhost:5432</code></td></tr>
    <tr><td>🔴 <strong>Redis</strong></td><td><code>localhost:6379</code></td></tr>
  </tbody>
</table>

Demo Account 👤

<table align="center" width="48%">
  <tr>
    <td align="center">
      <h2>Ready to use after seed</h2>
      <strong>Email</strong><br/>
      <code>demo@notifications.local</code>
      <br/><br/>
      <strong>Password</strong><br/>
      <code>Demo1234!</code>
    </td>
  </tr>
</table>

💡 No third-party credentials are required for local evaluation.
The Docker environment uses console providers by default, so Resend, Twilio, Firebase and Google OAuth credentials are optional.

Useful Docker Commands 🐳

Follow all logs

docker compose logs -f

Backend logs

docker compose logs -f backend

Frontend logs

docker compose logs -f frontend

PostgreSQL logs

docker compose logs -f db

Redis logs

docker compose logs -f redis

Stop the application

docker compose down

This keeps the PostgreSQL and Redis volumes.

Full reset

docker compose down -v
docker compose up --build

Use this when you want to recreate the databases and execute the seed again.

Rebuild without Docker cache

docker compose build --no-cache
docker compose up

🧰 Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=nodejs" width="82" alt="Node.js" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=ts" width="82" alt="TypeScript" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=nestjs" width="82" alt="NestJS" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=react" width="82" alt="React" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=vite" width="82" alt="Vite" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=prisma" width="82" alt="Prisma" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=postgres" width="82" alt="PostgreSQL" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=redis" width="82" alt="Redis" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=docker" width="82" alt="Docker" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=firebase" width="82" alt="Firebase" />
&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=githubactions" width="82" alt="GitHub Actions" />

<br/><br/>

<img src="https://img.shields.io/badge/Resend-Email-000000?style=for-the-badge" alt="Resend" />
<img src="https://img.shields.io/badge/Twilio-SMS-F22F46?style=for-the-badge&logo=twilio&logoColor=white" alt="Twilio" />
<img src="https://img.shields.io/badge/BullMQ-Queues-EF4444?style=for-the-badge" alt="BullMQ" />
<img src="https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />

</div>

🔗 Quick Links

<table align="center" width="78%">
  <thead>
    <tr>
      <th>Resource</th>
      <th>Local</th>
      <th>Production</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>🌐 <strong>Frontend</strong></td>
      <td><a href="http://localhost:5173">Open App</a></td>
      <td>🚧 Pending deployment</td>
    </tr>
    <tr>
      <td>⚙️ <strong>REST API</strong></td>
      <td><a href="http://localhost:3000/api">Open API</a></td>
      <td>🚧 Pending deployment</td>
    </tr>
    <tr>
      <td>📘 <strong>Swagger / OpenAPI</strong></td>
      <td><a href="http://localhost:3000/api/docs">Open Swagger</a></td>
      <td>🚧 Pending deployment</td>
    </tr>
    <tr>
      <td>📚 <strong>Compodoc</strong></td>
      <td><a href="http://localhost:8080">Open Docs</a></td>
      <td>🚧 Pending deployment</td>
    </tr>
    <tr>
      <td>📊 <strong>Coverage</strong></td>
      <td>—</td>
      <td><a href="https://coveralls.io/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main">View Coveralls</a></td>
    </tr>
  </tbody>
</table>

📌 Project Overview

Notifications Platform is a full-stack notification management system designed to create, process, send and track notifications through multiple delivery channels.

Authenticated users work only with their own notifications, while delivery is decoupled from HTTP requests through BullMQ + Redis and processed asynchronously by background workers.

The platform supports Email, SMS and Push delivery, real provider integrations, delivery status tracking, webhooks, dashboard metrics, authentication and API documentation.

🏗️ Architecture

<div align="center">

<pre>
                         ┌─────────────────────┐
                         │    React + Vite     │
                         │      Frontend       │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP / REST
                                    ▼
                         ┌─────────────────────┐
                         │      NestJS API     │
                         │ Auth · Users · JWT  │
                         │ Notifications       │
                         │ Swagger / OpenAPI   │
                         └─────┬────────┬──────┘
                               │        │
                 ┌─────────────┘        └──────────────┐
                 ▼                                     ▼
        ┌─────────────────┐                   ┌─────────────────┐
        │   PostgreSQL    │                   │      Redis      │
        │   Prisma ORM    │                   │   BullMQ Queue  │
        │ Users           │                   │ Jobs / Workers  │
        │ Notifications   │                   └────────┬────────┘
        │ Deliveries      │                            │
        └─────────────────┘                            ▼
                                          ┌─────────────────────┐
                                          │ Notification Worker │
                                          └──────────┬──────────┘
                                                     │
                             ┌───────────────────────┼──────────────────────┐
                             ▼                       ▼                      ▼
                       ┌───────────┐           ┌───────────┐         ┌───────────┐
                       │   EMAIL   │           │    SMS    │         │   PUSH    │
                       │  Resend   │           │  Twilio   │         │ Firebase  │
                       └───────────┘           └───────────┘         └───────────┘
</pre>

<strong>Notifications are processed asynchronously through BullMQ and Redis.</strong>

</div>

✨ Features

<table align="center" width="92%">
  <tr>
    <td align="center" width="33%">
      <h1>🔐</h1>
      <img src="https://img.shields.io/badge/Authentication-JWT%20%2B%20Google%20OAuth-4F46E5?style=for-the-badge" alt="Authentication" />
    </td>
    <td align="center" width="33%">
      <h1>📨</h1>
      <img src="https://img.shields.io/badge/Multi--Channel-Email%20%7C%20SMS%20%7C%20Push-0EA5E9?style=for-the-badge" alt="Multi-Channel" />
    </td>
    <td align="center" width="33%">
      <h1>⚡</h1>
      <img src="https://img.shields.io/badge/Async%20Delivery-BullMQ%20%2B%20Redis-EF4444?style=for-the-badge" alt="Async Delivery" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <h1>🗃️</h1>
      <img src="https://img.shields.io/badge/Persistence-PostgreSQL%20%2B%20Prisma-336791?style=for-the-badge" alt="Persistence" />
    </td>
    <td align="center">
      <h1>📊</h1>
      <img src="https://img.shields.io/badge/Dashboard-Metrics%20%2B%20Recent%20Activity-16A34A?style=for-the-badge" alt="Dashboard" />
    </td>
    <td align="center">
      <h1>🔄</h1>
      <img src="https://img.shields.io/badge/Delivery%20Tracking-Webhooks%20%2B%20Provider%20Status-F59E0B?style=for-the-badge" alt="Delivery Tracking" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <h1>📖</h1>
      <img src="https://img.shields.io/badge/Documentation-Swagger%20%2B%20Compodoc-85EA2D?style=for-the-badge" alt="Documentation" />
    </td>
    <td align="center">
      <h1>🐳</h1>
      <img src="https://img.shields.io/badge/Docker%20Ready-One--Command%20Environment-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Ready" />
    </td>
    <td align="center">
      <h1>✅</h1>
      <img src="https://img.shields.io/badge/Automated%20Testing-Unit%20%2B%20E2E-22C55E?style=for-the-badge" alt="Automated Testing" />
    </td>
  </tr>
</table>

🔧 Environment & Providers

<table align="center" width="74%">
  <thead>
    <tr>
      <th>Channel</th>
      <th>Local / Docker</th>
      <th>Real Provider</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>📧 Email</td><td>Console</td><td>Resend</td></tr>
    <tr><td>📱 SMS</td><td>Console</td><td>Twilio</td></tr>
    <tr><td>🔔 Push</td><td>Console</td><td>Firebase Cloud Messaging</td></tr>
    <tr><td>🔐 OAuth</td><td>Disabled</td><td>Google OAuth 2.0</td></tr>
  </tbody>
</table>

Default local configuration:

EMAIL_PROVIDER=console
SMS_PROVIDER=console
PUSH_PROVIDER=console
GOOGLE_OAUTH_ENABLED=false

Provider-specific environment variables are documented in:

backend_notifications/.env.providers.example

⚙️ Running the Tests

The project contains automated backend and frontend validation so changes can be checked before deployment.

<table align="center" width="86%">
  <tr>
    <td align="center" width="50%">
      <h1>🧪</h1>
      <strong>Backend</strong><br/><br/>
      Lint · Unit · E2E · Coverage · Build
    </td>
    <td align="center" width="50%">
      <h1>⚛️</h1>
      <strong>Frontend</strong><br/><br/>
      Lint · Unit · Component · Build
    </td>
  </tr>
</table>

Backend Tests 🔩

cd backend_notifications
npm ci
npm run lint:check
npm run test:unit
npm run test:e2e
npm run test:cov
npm run build

Frontend Tests 🧩

cd frontend_notifications
npm ci
npm run lint
npm run test
npm run build

📦 Deployment

<div align="center">

<img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
<img src="https://img.shields.io/coverallsCoverage/github/RoCalderon1405/Take_home_challenge_Notifications?branch=main&style=for-the-badge&logo=coveralls&logoColor=white" alt="Coveralls" />
<img src="https://img.shields.io/badge/Render-Deployment%20Pending-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />

<br/><br/>

<pre>
                         Pull Request
                              │
                              ▼
                       GitHub Actions
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
                Lint        Tests         Build
                              │
                              ▼
                          Coveralls
                              │
                              ▼
                             main
                              │
                              ▼
                            Render
</pre>

</div>

The production deployment target is Render.

Planned production services:

React / Vite frontend

NestJS API

PostgreSQL

Redis-compatible service

Compodoc static documentation

📚 Documentation

<table align="center" width="82%">
  <tr>
    <td align="center" width="50%">
      <h1>📘</h1>
      <strong>Swagger / OpenAPI</strong><br/><br/>
      Public REST API documentation<br/><br/>
      <a href="http://localhost:3000/api/docs">Open Swagger</a>
    </td>
    <td align="center" width="50%">
      <h1>📚</h1>
      <strong>Compodoc</strong><br/><br/>
      Internal NestJS / TypeScript documentation<br/><br/>
      <a href="http://localhost:8080">Open Compodoc</a>
    </td>
  </tr>
</table>

Swagger / OpenAPI 📘

http://localhost:3000/api/docs

Swagger documents the public REST API and supports JWT Bearer authentication for protected endpoints.

Compodoc 📚

cd backend_notifications
npm run docs
npm run docs:serve

Then open:

http://localhost:8080

🛠️ Built With

NestJS — Backend application framework

React + Vite — Frontend application

TypeScript — Shared development language

Prisma ORM — Database access and migrations

PostgreSQL — Persistent relational storage

Redis + BullMQ — Queueing and asynchronous processing

Resend — Email delivery

Twilio — SMS delivery

Firebase Cloud Messaging — Push delivery

Docker — Local containerized environment

Swagger / OpenAPI — Public API documentation

Compodoc — Internal technical documentation

GitHub Actions + Coveralls — CI and coverage reporting

✒️ Author

<div align="center">

<h2>Roberto Tonatiuh Calderon Aguilar</h2>

<h3>Full Stack Developer</h3>

<a href="https://portfoliorocalderon.netlify.app/#experience">
  <img src="https://img.shields.io/badge/Get%20in%20Touch-Portfolio-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Portfolio" />
</a>

<a href="https://github.com/RoCalderon1405">
  <img src="https://img.shields.io/badge/GitHub-RoCalderon1405-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
</a>

<br/><br/>

Built with NestJS · React · PostgreSQL · Redis · Docker

</div>
