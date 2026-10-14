# Rizq — Production Docker stack

## Services

| Service | Image / build | Role |
|---------|---------------|------|
| `nginx` | nginx:1.27-alpine | Reverse proxy, static site, `/uploads` |
| `api` | `rizq-backend/Dockerfile` | Express API (Node 22) |
| `postgres` | postgres:16-alpine | Primary database |
| `redis` | redis:7-alpine | Rate limits, admin sessions, hot cache |

## Quick start

```bash
cp .env.example .env
cp rizq-backend/.env.example rizq-backend/.env
# املأ الأسرار: SUPER_ADMIN_PASS_HASH, BACKEND_SHARED_SECRET, RIZQ_API_SECRET, POSTGRES_PASSWORD, ANTHROPIC_API_KEY

docker compose up -d --build
curl -fsS http://localhost/health
```

## Local development (without Docker DB)

```bash
# rizq-backend/.env
DB_DRIVER=sqlite
REDIS_ENABLED=0
npm --prefix rizq-backend start
```

## Notes

- Do not scale `api` replicas until Redis sessions/rate-limits are confirmed healthy.
- Postgres schema bootstraps from `rizq-backend/db/schema.postgres.sql`.
- TLS: mount certs and uncomment the 443 block in `deploy/nginx.conf`.
