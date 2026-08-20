# Configuration reference

Copy the supplied examples before running the application:

```bash
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env.local
```

For Docker Compose, copy the root example:

```bash
cp .env.example .env
```

Replace every secret placeholder. Do not commit any populated `.env` file.

## Backend

### Required

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and the shared `pg` pool. |
| `JWT_SECRET` | Signs and verifies 24-hour backend JWTs. Startup fails if it is missing. |

### Runtime and HTTP

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test`. |
| `PORT` | No | `3001` | Express API port. |
| `FRONTEND_URL` | No | `http://localhost:3000` in production CORS configuration | Allowed production frontend origin. |

### Administrative authorization

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ADMIN_EMAILS` | Required to use admin routes | Empty allowlist | Comma-separated user emails allowed to call `/api/v1/admin/*`. |

An empty or missing `ADMIN_EMAILS` value denies administrative access. Email matching is trimmed and case-insensitive.

Example:

```env
ADMIN_EMAILS=ayesha@example.com,second-admin@example.com
```

### Redis

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REDIS_URL` | No | — | Complete Redis connection URI. Takes precedence over host/port settings. A reachable Redis service is required by API startup. |
| `REDIS_HOST` | No | `localhost` | Redis hostname when `REDIS_URL` is absent. |
| `REDIS_PORT` | No | `6379` | Redis port when `REDIS_URL` is absent. |
| `REDIS_PASSWORD` | No | — | Redis password when authentication is enabled. |

The API requires Redis during container startup. After startup, job read
operations fall back to PostgreSQL and cache writes become no-ops when Redis is
unavailable. The standalone scraper catches its cache connection failure and
continues with PostgreSQL.

### PostgreSQL pool

| Variable | Required | Development default | Production default |
| --- | --- | --- | --- |
| `DB_POOL_MAX` | No | `2` | `20` |
| `DB_POOL_IDLE_TIMEOUT_MS` | No | `10000` | `30000` |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | No | `15000` | `10000` |
| `DB_SSL` | No | Disabled | Disabled unless set to `true`/`1` or the URL uses `db.prisma.io` |

### Scraper behavior

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ENABLE_EXPERIMENTAL_SOURCES` | No | `false` | Includes experimental sources such as NoDesk when set to `true`. |
| `DEBUG` | No | `false` | Enables additional processing diagnostics. |
| `TRACE` | No | `false` | Enables the most detailed scraper/processor tracing. |

### Reserved settings (not implemented)

| Variable | Description |
| --- | --- |
| `ANTHROPIC_API_KEY` | Loaded by configuration, but no Anthropic workflow currently consumes it. |
| `RESEND_API_KEY` | Loaded by configuration, but outbound email is not implemented. |
| `ALERT_EMAIL` | Reserved; no alert dispatcher currently consumes it. |
| `FROM_EMAIL` | Reserved; no outbound-email path currently consumes it. |

These names are retained only as placeholders. Do not present AI enrichment,
email delivery, or alerting as implemented capabilities.

## Frontend

| Variable | Required | Local default in code | Description |
| --- | --- | --- | --- |
| `NEXTAUTH_SECRET` | Yes | None | Signs the frontend NextAuth JWT session. |
| `NEXTAUTH_URL` | Recommended | Framework-derived | Public frontend URL. Use `http://localhost:3000` locally. |
| `NEXT_PUBLIC_API_URL` | Yes for deployment | `http://localhost:3001/api/v1` | Browser-visible API base URL. |
| `INTERNAL_API_URL` | Yes in containers/SSR | `http://api:3001/api/v1` | Server-side API base URL. |
| `NODE_ENV` | No | `development` | Frontend runtime mode. |
| `PORT` | No | `3000` | Next.js port. |

Docker Compose accepts `AUTH_SECRET` in the root `.env` and passes it to the frontend as `NEXTAUTH_SECRET`.

## Secret separation

Use independent random values:

```text
AUTH_SECRET / NEXTAUTH_SECRET
    signs the frontend NextAuth session

JWT_SECRET
    signs the backend API bearer token
```

Do not reuse database passwords for either secret.

## Startup validation

- Missing `DATABASE_URL` stops backend configuration.
- Missing `JWT_SECRET` stops backend configuration.
- An unreachable Redis service stops the current API bootstrap.
- Docker Compose refuses to render when `JWT_SECRET`, `AUTH_SECRET`, or `ADMIN_EMAILS` is unset.
- A missing `ADMIN_EMAILS` in non-Docker local development leaves all admin endpoints forbidden.

## Related documentation

- [Authentication architecture](../architecture/authentication.md)
- [REST API reference](api.md)
- [Local development](../guides/local-development.md)
