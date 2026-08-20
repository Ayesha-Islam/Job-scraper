# Local development

This guide covers the shortest path to a working development environment and
the equivalent Docker workflow.

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL 16 or a compatible recent version
- Redis 7 (required by the current API startup path)
- Docker with Compose, if using the container workflow

## Run services on the host

### 1. Configure the API

```bash
cd api
cp .env.example .env
npm install
```

Edit `api/.env`. At minimum, provide a reachable `DATABASE_URL`, a reachable
Redis configuration, a long random `JWT_SECRET`, and an `ADMIN_EMAILS` value if
you need admin routes.

Generate the Prisma client and apply development migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the API:

```bash
npm run dev
```

It listens on `http://localhost:3001` by default.

### 2. Configure the frontend

In another terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Replace the example `NEXTAUTH_SECRET` first. The frontend runs at
`http://localhost:3000` and calls the API at the URL in
`NEXT_PUBLIC_API_URL`.

### 3. Verify the stack

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/jobs
```

Then open `http://localhost:3000`.

## Run with Docker Compose

From the repository root:

```bash
cp .env.example .env
```

Replace all placeholder passwords and secrets, then run:

```bash
docker compose up --build
```

Useful lifecycle commands:

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

`docker compose down -v` also deletes the named PostgreSQL and Redis volumes.
Use it only when you intend to discard local data.

Compose requires `JWT_SECRET`, `AUTH_SECRET`, and `ADMIN_EMAILS`; configuration
fails early when they are absent.

## Run a scrape

The CLI runs all enabled providers:

```bash
cd api
npm run scrape
```

The admin API can run all providers or one named provider, but it requires a
backend JWT whose email is present in `ADMIN_EMAILS`. See the
[API reference](../reference/api.md) for the request.

NoDesk is experimental. Enable it explicitly only for a test run:

```bash
ENABLE_EXPERIMENTAL_SOURCES=true npm run scrape
```

Before scraping an external site, verify its terms, robots policy, and permitted
request rate.

## Database changes

Edit `api/prisma/schema.prisma`, then create and apply a development migration:

```bash
cd api
npm run prisma:migrate
npm run prisma:generate
```

Review the generated SQL before committing it. Use Prisma Studio to inspect
local data:

```bash
npm run prisma:studio
```

The schema and constraints are described in the
[database reference](../reference/database.md).

## Verification before a change is shared

```bash
cd api
npm test
npm run build

cd ../frontend
npm run type-check
npm run build
```

For focused investigation and live provider checks, see
[Testing and debugging](testing-and-debugging.md).

## Common startup failures

| Symptom | Check |
|---|---|
| API exits at startup | `JWT_SECRET` exists and is not blank |
| Prisma cannot connect | `DATABASE_URL`, PostgreSQL port, and database existence |
| Admin route returns `403` | Token email exactly matches an `ADMIN_EMAILS` entry |
| Frontend auth fails | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and API URLs |
| API exits while connecting to cache | Start Redis and verify `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` |
| Cache disconnects after startup | Reads should miss safely and fall back to PostgreSQL; inspect Redis health before relying on cache metrics |
| Browser scraper fails in Docker | Chromium executable path and container memory |

All settings are listed in [Configuration](../reference/configuration.md).
