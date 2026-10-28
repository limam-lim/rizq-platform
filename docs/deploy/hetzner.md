# Deploy Rizq on Hetzner

## Prerequisites

- Ubuntu 22.04+ VPS (CX31 or larger recommended)
- Docker + Docker Compose plugin
- Domain DNS → server IP
- Strong secrets (never commit): `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, admin hashes, `BACKEND_SHARED_SECRET`

## One-time setup

```bash
git clone <repo> /opt/rizq && cd /opt/rizq
export POSTGRES_USER=rizq POSTGRES_DB=rizq
export POSTGRES_PASSWORD='…' REDIS_PASSWORD='…'
cp rizq-backend/.env.example rizq-backend/.env
# Edit rizq-backend/.env:
#   DB_DRIVER=postgres
#   DATABASE_URL=postgres://rizq:${POSTGRES_PASSWORD}@postgres:5432/rizq
#   REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
#   REDIS_ENABLED=1
#   NODE_ENV=production + admin / Anthropic / backup keys
```

## Bring up the stack

```bash
docker compose up -d --build
# API runs migrations on boot when RUN_MIGRATIONS_ON_BOOT=1
# Or manually:
docker compose exec api npm run migrate
```

## Health

- `curl -fsS http://127.0.0.1/health`
- `docker compose ps`
- Postgres/Redis are not published publicly in prod compose

## SQLite → Postgres (optional cutover)

```bash
# Copy legacy rizq.db into the api container data volume, then:
docker compose exec api npm run migrate:sqlite-to-pg -- --db /app/data/rizq.db
```

## Notes

- Source maps: none (plain Node; `NODE_ENV=production` in the API image).
- Redis is optional at runtime — if Redis is down, rate limits / cache / sessions fall back to memory.
- TLS: terminate at Hetzner LB / Caddy / certbot in front of nginx, or mount certs into the nginx service.
