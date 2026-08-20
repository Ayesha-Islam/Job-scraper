# REST API Reference

## Base URL

```text
http://localhost:3001/api/v1
```

All request and response bodies use JSON unless stated otherwise.

## Response envelopes

Successful responses use:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-07-25T12:00:00.000Z"
  }
}
```

`meta` is included only by endpoints that add metadata.

Errors use a string message:

```json
{
  "success": false,
  "error": "Job not found"
}
```

## Authentication

Protected endpoints expect the backend token returned by `POST /auth/login`:

```http
Authorization: Bearer <backend-jwt>
```

The frontend stores this token inside its NextAuth JWT session. NextAuth session and logout routes belong to the Next.js application and are not Express API endpoints.

## Health

### `GET /health`

Authentication: not required.

The endpoint is also available without the `/api/v1` prefix at `/health`.

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-07-25T12:00:00.000Z",
    "uptime": 3600,
    "database": {
      "status": "connected"
    },
    "cache": {
      "status": "connected"
    }
  }
}
```

Related component checks:

| Method | Path | Authentication |
| --- | --- | --- |
| `GET` | `/health/db` | None |
| `GET` | `/health/redis` | None |

## Jobs

### `GET /jobs`

Authentication: not required.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | integer | `1` | Page number. |
| `limit` | integer | `20` | Results per page. |
| `search` | string | — | Case-insensitive match against position, company, location, or description. |
| `company` | string | — | Case-insensitive company filter. |
| `location` | string | — | Case-insensitive location filter. |
| `type` | enum | — | `FULL_TIME`, `PART_TIME`, `CONTRACT`, or `INTERNSHIP`. `ALL` disables the filter. |
| `source` | string | — | Exact source name. |
| `sortBy` | enum | `recent` | `recent`, `oldest`, or `salary`. |

Example:

```http
GET /api/v1/jobs?page=1&limit=20&search=typescript&sortBy=recent
```

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "job-uuid",
        "company": "Example",
        "position": "Backend Engineer",
        "location": "Remote",
        "source": "RemoteOK"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "meta": {
    "timestamp": "2026-07-25T12:00:00.000Z"
  }
}
```

### `GET /jobs/search`

Authentication: not required.

| Parameter | Required | Description |
| --- | --- | --- |
| `q` | Yes | Search term. |
| `page` | No | Page number; defaults to `1`. |
| `limit` | No | Results per page; defaults to `20`. |

This route is a convenience search endpoint. The main `/jobs` endpoint also accepts the broader filter set through `search`.

### `GET /jobs/:id`

Authentication: not required.

`id` is the Job UUID. A missing job returns `404`.

## Authentication

### `POST /auth/register`

Authentication: not required.

```json
{
  "name": "Ayesha Islam",
  "email": "ayesha@example.com",
  "password": "at-least-eight-characters"
}
```

Returns `201` with public user fields. Registration does not return a token.

Possible errors:

- `400` for missing/invalid fields;
- `409` when the email already exists.

### `POST /auth/login`

Authentication: not required.

```json
{
  "email": "ayesha@example.com",
  "password": "the-user-password"
}
```

```json
{
  "success": true,
  "token": "backend-jwt",
  "data": {
    "id": 1,
    "email": "ayesha@example.com",
    "name": "Ayesha Islam"
  }
}
```

The backend JWT expires after 24 hours.

### `GET /auth/me`

Authentication: required.

Returns the public profile for the authenticated backend user.

## Saved jobs

All saved-job endpoints require a valid backend JWT.

### `POST /saved-jobs`

```json
{
  "jobId": "job-uuid"
}
```

Returns `201` with the SavedJob record and its related Job.

Possible errors:

- `404` when the Job does not exist;
- `409` when the user already saved the Job.

### `GET /saved-jobs`

Returns SavedJob records with their related Job, ordered by `savedAt` descending.

### `GET /saved-jobs/check/:jobId`

```json
{
  "success": true,
  "data": {
    "saved": true
  }
}
```

### `DELETE /saved-jobs/:jobId`

`jobId` is the Job UUID, not the SavedJob integer ID.

```json
{
  "success": true,
  "data": {
    "removed": true
  }
}
```

## Statistics

### `GET /stats`

Authentication: not required.

Returns:

- total active jobs;
- jobs added since the API server's local start-of-day boundary;
- counts by source;
- counts by employment type.

`GET /stats/sources` currently returns the same payload.

## Administration

All `/admin/*` endpoints require:

1. a valid backend bearer token; and
2. a token email listed in `ADMIN_EMAILS`.

Unauthenticated requests return `401`. Authenticated users outside the allowlist return `403`.

### `POST /admin/scrape`

Runs all configured scrapers:

```json
{}
```

Runs one configured source:

```json
{
  "source": "RemoteOK"
}
```

The scrape currently runs inside the HTTP request process. The endpoint can consume significant time and browser resources and should not be exposed publicly without additional rate and resource controls.

### `GET /admin/scrape`

Returns `405 Method Not Allowed` for an authorized administrator. Use `POST`.

### `GET /admin/scrape/logs`

Supports `page` and `limit`; returns persisted ScrapeLog records newest first.

### `GET /admin/scrape/stats`

Returns scrape statistics calculated from logs created during the previous 24 hours.

### `DELETE /admin/cache`

Invalidates job-list, job-detail, and statistics cache keys.

### `GET /admin/cache/stats`

Returns Redis keyspace hits, misses, hit rate, and the current key count.

## Current API limitations

- No API rate limiting is implemented.
- Pagination parameters are parsed but not yet bounded to safe maximum values.
- Error messages are strings rather than structured error objects/codes.
- Administrative scraping runs synchronously in the API process.
- API versioning is expressed in the URL, but no compatibility policy is defined yet.

## Related documentation

- [Authentication architecture](../architecture/authentication.md)
- [Configuration](configuration.md)
- [Database](database.md)
- [Search and caching](../architecture/search-and-caching.md)
