# Database reference

PostgreSQL is the system of record. Prisma defines the schema in
`api/prisma/schema.prisma` and generates the application client.

## Models

| Model | Purpose | Primary identity |
|---|---|---|
| `Job` | Normalized job listing and ingestion metadata | UUID `id` |
| `ScrapeLog` | One persisted provider-run outcome | UUID `id` |
| `User` | Credentials-based application account | Integer `id`; unique `email` |
| `SavedJob` | User-to-job bookmark relation | Integer `id`; unique user/job pair |

The schema contains four models and two enums: `JobType` and `ScrapeStatus`.
NextAuth's credentials flow uses the `User` record; there is no separate
`Account` model in the current Prisma schema.

## `Job`

### Listing fields

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | UUID primary key |
| `company` | `String` | Display value |
| `position` | `String` | Display value |
| `location` | `String?` | Display value |
| `salary` | `String?` | Unstructured source text |
| `type` | `JobType` | Defaults to `FULL_TIME` |
| `url` | `String` | Application or canonical listing URL |
| `source` | `String` | Stable provider label |
| `description` | `String?` | Defaults to an empty string |
| `postedAt` | `DateTime` | Defaults to insertion time when source time is absent |

### Identity and lifecycle fields

| Field | Type | Notes |
|---|---|---|
| `companyKey` | `String` | Normalized identity component |
| `positionKey` | `String` | Normalized identity component |
| `locationKey` | `String` | Normalized identity component |
| `isActive` | `Boolean` | Defaults to `true` |
| `scrapedAt` | `DateTime` | Latest scrape observation |
| `createdAt` | `DateTime` | Row creation time |
| `updatedAt` | `DateTime` | Maintained by Prisma |

The database enforces:

```text
UNIQUE(companyKey, positionKey, locationKey)
```

This is the final duplicate-prevention boundary. URL is deliberately not unique.
See [ADR 0002](../decisions/0002-deterministic-deduplication.md).

Indexes exist for source, creation time, active state, and each identity
component.

## `ScrapeLog`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | UUID primary key |
| `source` | `String` | Provider label |
| `status` | `ScrapeStatus` | `SUCCESS` or `FAILED` |
| `jobsFound` | `Int` | Extracted count |
| `jobsAdded` | `Int` | Inserted count |
| `errorMessage` | `String?` | Bounded failure summary |
| `durationMs` | `Int` | Run duration |
| `completedAt` | `DateTime` | Defaults to current time |

Indexes support filtering by source, status, and completion time.

## `User`

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | Auto-incrementing primary key |
| `name` | `String` | Display name |
| `email` | `String` | Unique login identifier |
| `password` | `String` | bcrypt hash, never plaintext |
| `createdAt` | `DateTime` | Mapped to `created_at` |
| `updated_at` | `DateTime` | Mapped to `updated_at` |

The table is mapped to `users`.

## `SavedJob`

`SavedJob` joins an integer user ID to a UUID job ID. Both relations cascade on
delete. The composite uniqueness constraint on `(userId, jobId)` prevents a user
from saving the same job twice. Both foreign keys are indexed.

## Enums

`JobType` values:

- `FULL_TIME`
- `PART_TIME`
- `CONTRACT`
- `INTERNSHIP`

`ScrapeStatus` values:

- `SUCCESS`
- `FAILED`

## Schema workflow

After editing `api/prisma/schema.prisma`:

```bash
cd api
npm run prisma:migrate
npm run prisma:generate
```

Review generated migration SQL before sharing it. Application code should not
assume a schema change exists until its migration has been applied.

## Query ownership

Prisma handles schema management and standard model operations. Parameterized
raw SQL handles dynamic search in `api/src/lib/job.sql.ts`. The reasoning
and tradeoffs are documented in
[ADR 0001](../decisions/0001-prisma-and-raw-sql.md).

## Related

- [Ingestion and data quality](../architecture/ingestion-and-data-quality.md)
- [Authentication](../architecture/authentication.md)
- [Local development](../guides/local-development.md)
