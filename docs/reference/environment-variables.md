# Environment Variables Reference

## Overview

JobScraper is configured entirely through environment variables.

Environment variables control:

* Application runtime
* Database connectivity
* Redis configuration
* Authentication
* Frontend API communication
* Database connection pooling
* Optional third-party integrations

The backend validates required configuration during startup and fails immediately if critical variables are missing.

---

# Loading Strategy

Backend configuration is loaded from:

```text
api/.env
```

using `dotenv`.

Frontend configuration is loaded from:

```text
frontend/.env.local
```

(or `.env` during local development).

The backend exposes a strongly typed configuration object through `config.ts`, which provides sensible defaults where appropriate while enforcing required variables such as `DATABASE_URL`.

---

# Backend Environment Variables

## Runtime

| Variable   | Required | Default       | Description                                                         |
| ---------- | -------- | ------------- | ------------------------------------------------------------------- |
| `NODE_ENV` | No       | `development` | Controls application mode (`development`, `production`, or `test`). |
| `PORT`     | No       | `3001`        | Port used by the Express API server.                                |

---

## Database

| Variable        | Required | Default | Description                                                                     |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`  | **Yes**  | —       | PostgreSQL connection string used by Prisma and the PostgreSQL connection pool. |
| `POSTGRES_PORT` | No       | `5432`  | Local PostgreSQL port used during development.                                  |

---

## Redis

| Variable         | Required | Default     | Description                                         |
| ---------------- | -------- | ----------- | --------------------------------------------------- |
| `REDIS_HOST`     | No       | `localhost` | Redis hostname.                                     |
| `REDIS_PORT`     | No       | `6379`      | Redis port.                                         |
| `REDIS_URL`      | No       | —           | Complete Redis connection URI.                      |
| `REDIS_PASSWORD` | No       | —           | Password used when Redis authentication is enabled. |

---

## Authentication

| Variable     | Required | Default | Description                                                               |
| ------------ | -------- | ------- | ------------------------------------------------------------------------- |
| `JWT_SECRET` | **Yes**  | —       | Secret used to sign JWT access tokens returned by the authentication API. |

---

## Frontend Communication

| Variable       | Required | Default                 | Description                                                  |
| -------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `FRONTEND_URL` | No       | `http://localhost:3000` | Allowed frontend origin for CORS and frontend communication. |

---

## Database Pool Configuration

The PostgreSQL connection pool can be customized through the following variables.

| Variable                        | Required | Default                                                               |
| ------------------------------- | -------- | --------------------------------------------------------------------- |
| `DB_POOL_MAX`                   | No       | `2` (development), `20` (production)                                  |
| `DB_POOL_IDLE_TIMEOUT_MS`       | No       | `10000` (development), `30000` (production)                           |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | No       | `15000` (development), `10000` (production)                           |
| `DB_SSL`                        | No       | Disabled unless explicitly enabled or using a Prisma-hosted database. |

These settings control the behavior of the shared `pg` connection pool used for search queries.

---

## Optional Integrations

The backend already supports optional integrations that are not required for local development.

| Variable            | Description                                       |
| ------------------- | ------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Reserved for Anthropic API integration.           |
| `RESEND_API_KEY`    | Reserved for Resend email integration.            |
| `ALERT_EMAIL`       | Destination email address for operational alerts. |
| `FROM_EMAIL`        | Sender address used for outbound emails.          |

These variables are optional and may be omitted when the corresponding functionality is not in use.

---

# Frontend Environment Variables

## Authentication

| Variable          | Required | Description                                        |
| ----------------- | -------- | -------------------------------------------------- |
| `AUTH_SECRET`     | **Yes**  | Secret used by the frontend authentication system. |
| `NEXTAUTH_SECRET` | **Yes**  | Secret used for signing NextAuth sessions.         |
| `NEXTAUTH_URL`    | **Yes**  | Public URL of the frontend application.            |

---

## API Communication

| Variable              | Required | Description                                              |
| --------------------- | -------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | **Yes**  | Public API base URL used by browser requests.            |
| `INTERNAL_API_URL`    | **Yes**  | Internal API base URL used during server-side rendering. |

---

## Runtime

| Variable   | Required | Default       |
| ---------- | -------- | ------------- |
| `NODE_ENV` | No       | `development` |
| `PORT`     | No       | `3000`        |

---

# Example Development Configuration

Backend

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://..."
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your-secret"
```

Frontend

```env
NEXTAUTH_SECRET="your-secret"
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
INTERNAL_API_URL="http://localhost:3001/api/v1"
NODE_ENV=development
PORT=3000
```

---

# Variable Relationships

Some variables work together.

```text
Frontend

↓

NEXT_PUBLIC_API_URL

↓

Backend API

↓

DATABASE_URL

↓

PostgreSQL
```

Likewise,

```text
Backend

↓

REDIS_HOST / REDIS_PORT

↓

Redis Cache
```

and

```text
Frontend Authentication

↓

NEXTAUTH_SECRET

↓

Backend Authentication

↓

JWT_SECRET
```

Although both relate to authentication, **`NEXTAUTH_SECRET` and `JWT_SECRET` serve different purposes**. The former protects frontend session handling, while the latter signs backend-issued JWTs.

---

# Validation

The backend validates required configuration during startup.

If `DATABASE_URL` is missing, startup fails immediately with a descriptive error rather than allowing the application to continue in an invalid state.

---

# Best Practices

* Never commit real secrets to version control.
* Use different secrets for development and production.
* Rotate authentication secrets periodically.
* Keep database credentials outside the repository.
* Review new environment variables before adding them to shared configuration.

---

# Related Documentation

* Local Development Guide
* Docker Guide
* Database Design
* Authentication Architecture
* REST API Reference
