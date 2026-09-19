#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

command -v docker >/dev/null 2>&1 || { echo 'Install Docker with Docker Compose first.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Start Docker and try again.' >&2; exit 1; }
docker compose version

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo 'Created .env with local demo settings.'
else
  echo 'Using your existing .env without overwriting it.'
fi

echo 'Starting the stack. Default ports: 3000, 5173, 5432, 6379.'
echo 'The first build downloads dependencies and may take several minutes.'
if ! docker compose up --build --wait --wait-timeout 300; then
  echo 'Startup failed. Check port conflicts and run: docker compose logs --tail=100' >&2
  exit 1
fi
docker compose ps
echo 'Frontend: http://localhost:5173'
echo 'Swagger (default PORT=3000): http://localhost:3000/api/docs'
echo 'Demo login from .env.example: demo@notifications.local / Demo1234!'
echo 'Existing .env values take precedence; use its configured port and demo account.'
