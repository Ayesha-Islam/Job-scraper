# Testing and debugging

Use automated tests for stable behavior and a controlled live check for
third-party selectors. A green fixture test cannot prove that an external page
still has the same markup.

## Standard checks

Backend:

```bash
cd api
npm test
npm run build
```

Watch mode and coverage:

```bash
npm run test:watch
npm run test:coverage
```

Frontend:

```bash
cd frontend
npm run type-check
npm run build
```

## Debug by pipeline stage

| Symptom | First boundary to inspect |
|---|---|
| Provider returns zero jobs | Network response, status, and listing selectors |
| Jobs are found but not saved | Processor validation and skip reasons |
| Descriptions contain menus or login text | Source policy and enrichment cleanup |
| Duplicate rows appear | Normalized key values and database constraint |
| Existing row does not improve | Update selection and description-quality comparison |
| Search count differs from rows | Filters in both SQL queries |
| Stale reads after a write | Cache key and invalidation family |
| Admin route returns `401` | JWT presence, signature, and expiry |
| Admin route returns `403` | `ADMIN_EMAILS` membership |

## Scraper investigation

Start with one source and one page where possible. Record:

- HTTP status or browser navigation result;
- number of listing containers;
- one sanitized extracted record;
- processor skip reasons;
- enrichment success/failure count;
- database insert/update/duplicate counts;
- browser and page cleanup.

Avoid logging credentials, full JWTs, session cookies, or private query
parameters.

If an adapter uses Puppeteer, temporarily run headful mode in a local development
change when visual inspection is necessary. Do not commit debug-only delays or
disabled security settings.

## Data-quality investigation

Inspect the values immediately before persistence:

```text
companyKey
positionKey
locationKey
source
url
description length
```

For a suspected duplicate, compare all three normalized key values. For a
description regression, preserve both the listing text and enrichment candidate
long enough to identify why the quality rule selected one.

Use Prisma Studio for local inspection:

```bash
cd api
npm run prisma:studio
```

## Database and migration failures

Confirm:

1. `DATABASE_URL` addresses the intended database;
2. PostgreSQL is reachable;
3. generated Prisma client matches the schema;
4. migrations are applied;
5. the composite job key contains normalized, non-null key values.

Regenerate after schema changes:

```bash
npm run prisma:generate
```

Do not delete a production migration or reset a database as a debugging shortcut.

## Cache failures

Test the request with Redis stopped. A correct response from PostgreSQL confirms
the fallback boundary. Then inspect:

- Redis URL or host/port;
- serialization errors;
- whether every search parameter is represented in the key;
- whether a write invalidates lists, details, and statistics.

Use care with cache clearing. It is an operational action protected by the admin
allowlist.

## Authentication failures

Decode a development token only in a safe local tool and verify its `sub`,
`email`, `iat`, and `exp` claims. The backend and NextAuth secrets are separate.
A valid user token is not automatically an admin token: its email must also
appear in `ADMIN_EMAILS`.

## Reporting a failure

A useful issue includes:

- exact command or endpoint;
- expected and actual result;
- sanitized logs;
- source name and observation time for scraper problems;
- minimal fixture or request;
- database/cache availability;
- whether the failure reproduces on a second run.

The three engineering notes capture recurring failure patterns:
[description quality](../engineering-notes/description-quality.md),
[cross-source deduplication](../engineering-notes/cross-source-deduplication.md),
and [scraper execution reliability](../engineering-notes/scraper-execution-reliability.md).
