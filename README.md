# JobScraper

JobScraper is a full-stack remote-job aggregator built around a data-quality
problem: different job boards describe the same vacancy in incompatible and
sometimes unreliable ways.

The system collects candidate listings, sends every source through shared
validation and description-quality rules, deduplicates jobs with a
database-enforced business key, and exposes the resulting dataset through an
Express API and Next.js interface.

## Why this project matters

A scraper can return HTML and still produce bad data. Real extraction output
included missing descriptions, authentication walls, navigation text, unstable
URLs, and the same role published through different sources.

JobScraper addresses that boundary explicitly:

```text
Provider extraction
  → normalization and validation
  → source-aware description handling
  → deterministic deduplication
  → PostgreSQL
  → cache invalidation
  → searchable API and web interface
```

The central engineering decision is to treat external data as untrusted rather
than letting each provider write directly to the database.

## What is implemented

- Eight provider adapters enabled by default; NoDesk is experimental.
- Shared validation with explicit rejection reasons and quality metrics.
- Description cleanup for page wrappers, authentication walls, and other noise.
- Deterministic `companyKey + positionKey + locationKey` deduplication backed by
  a PostgreSQL unique constraint.
- Parameterized SQL search with filtering, ordering, counts, and pagination.
- Redis cache-aside reads with bounded TTLs and write-path invalidation.
- Registration, login, saved jobs, statistics, and health endpoints.
- JWT-protected administrative routes with an email allowlist.
- Daily in-process scraping at 02:00 in the server's local timezone.

## Verification

The reviewed working tree passes:

- **126 backend tests across 17 files**
- **Backend TypeScript compiler check (`tsc --noEmit`)**
- **Next.js production build**

A historical scrape snapshot and a reproducible description-cleaning
microbenchmark are documented without turning them into unsupported production
performance claims. See [Verification evidence](docs/evidence/verification.md).

## Capability status

| Status | Capability |
|---|---|
| Implemented | Shared ingestion, deterministic deduplication, search, caching, authentication, saved jobs, admin controls |
| Experimental | NoDesk provider adapter |
| Planned | Durable job queue, distributed scheduling, full-text/trigram search, scalable cache invalidation, rate limiting, token refresh |

## Technology

- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis
- **Scraping:** Puppeteer, Cheerio
- **Frontend:** Next.js, React, Tailwind CSS, NextAuth
- **Verification:** Vitest, TypeScript builds, reproducible microbenchmark
- **Local stack:** Docker Compose

## Run locally

Prerequisites: Node.js 20+, PostgreSQL, and Redis. The API bootstrap currently
requires both data services to be reachable; the standalone scraper can continue
when its cache connection is unavailable.

```bash
cd api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

In another terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Replace all example secrets before starting the
applications. The complete setup, Docker workflow, and troubleshooting steps are
in [Local development](docs/guides/local-development.md).

## Current boundaries

- Providers execute sequentially inside the API process.
- The scheduler has an in-memory lock, not a distributed lease.
- Search uses leading-wildcard PostgreSQL `ILIKE`; database search latency has
  not been benchmarked.
- Pagination values are parsed but are not yet capped to safe maximums.
- Redis invalidation uses `KEYS`, which is suitable only for the current small
  keyspace.
- Provider HTML, access policies, and availability can change independently of
  this repository.
- Authentication does not yet include refresh tokens, password reset, email
  verification, MFA, or rate limiting.

## Documentation

- [Project case study](docs/case-study.md)
- [Architecture overview](docs/architecture/overview.md)
- [Documentation index](docs/README.md)
- [REST API reference](docs/reference/api.md)
- [Verification evidence](docs/evidence/verification.md)
- [Standalone scraper dependency incident](docs/engineering-notes/standalone-scraper-dependency-container.md)

## Repository layout

```text
api/       Express API, processing pipeline, scrapers, Prisma schema, tests
frontend/  Next.js interface and authentication bridge
docs/      Case study, architecture, decisions, guides, reference, evidence
```

## License

Licensed under the [ISC License](LICENSE).
