$ErrorActionPreference = 'Stop'

# Run from the project root even when invoked from another directory.
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Install Docker Desktop with Docker Compose and start it first.'
    }
    docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker is not running. Start Docker Desktop and try again.' }
    docker compose version
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }

    if (-not (Test-Path -LiteralPath '.env')) {
        Copy-Item -LiteralPath '.env.example' -Destination '.env'
        Write-Host 'Created .env with local demo settings.'
    } else {
        Write-Host 'Using your existing .env without overwriting it.'
    }

    Write-Host 'Starting the stack. Default ports: 3000, 5173, 5432, 6379.'
    Write-Host 'The first build downloads dependencies and may take several minutes.'
    docker compose up --build --wait --wait-timeout 300
    if ($LASTEXITCODE -ne 0) {
        throw 'Startup failed. Check port conflicts and run: docker compose logs --tail=100'
    }
    docker compose ps
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read container status.' }
    Write-Host 'Frontend: http://localhost:5173'
    Write-Host 'Swagger (default PORT=3000): http://localhost:3000/api/docs'
    Write-Host 'Demo login from .env.example: demo@notifications.local / Demo1234!'
    Write-Host 'Existing .env values take precedence; use its configured port and demo account.'
} finally {
    Pop-Location
}
