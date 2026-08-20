# Engineering note: A network-looking scraper failure was a dependency-container bug

## What happened

During standalone scraper development, an `EAI_AGAIN`-style failure initially
looked like a PostgreSQL or DNS outage. The database itself was reachable. The
standalone execution path had constructed only part of the application's
dependency graph: it provided Prisma, but not the shared `pg` pool used by
`JobService` for parameterized SQL and maintenance queries.

The error label described where execution surfaced, not the actual ownership
problem. Retrying DNS or replacing the database connection string could not make
an incomplete service container valid.

## Root cause

`JobService` uses two database access paths:

- `container.db` (Prisma) for model CRUD;
- `container.pool` (`pg.Pool`) for search, statistics, and direct SQL work.

A caller that supplies only the Prisma client satisfies only half of that
contract. The API path already owned a complete container, while the standalone
path had drifted into constructing its own incomplete dependencies.

## Correction

The standalone scraper now imports the configured application container and
passes that container to `JobService`. `api/src/config.ts` constructs the shared
pool from the same `DATABASE_URL`, and `api/src/scrape.ts` performs an explicit
database connection check before provider work begins.

The operational checks are now separate:

1. verify the database hostname appropriate to the execution context (`localhost`
   on the host, Compose service names inside the Compose network);
2. verify Prisma connectivity;
3. verify that the shared container supplies both `db` and `pool`;
4. classify provider DNS failures separately from database/container failures.

Redis is handled differently in the standalone command: its initial connection
failure is caught and cache operations become no-ops, so scraping can still
persist through PostgreSQL.

## Evidence in the current tree

- `api/src/scrape.ts` imports `container` and passes it to `JobService`.
- `api/src/services/job.svc.ts` reads both `container.db` and `container.pool`.
- `api/src/config.ts` creates the shared `pg.Pool` from `DATABASE_URL`.
- `api/tests/unit/job.svc.test.ts` exercises the service with explicit database
  collaborators.

This is repository and test evidence for dependency wiring, not proof that DNS,
PostgreSQL, or external providers are continuously available.

## Remaining gap

The repository does not include an end-to-end test that launches the real
standalone CLI against live PostgreSQL and Redis services. A future integration
test should boot the same dependency container used in production startup,
execute a no-provider or fixture-backed run, and assert that both Prisma and the
raw SQL pool are initialized. Until then, live connectivity remains an
environment check rather than a unit-test guarantee.

## Lesson

When one execution mode works and another fails, compare dependency construction
before treating the most visible network error as the root cause. Long-lived
services should have one composition root, and alternate entry points should
reuse it instead of recreating only the dependencies they happen to know about.

## Related

- [Scraper execution reliability](scraper-execution-reliability.md)
- [Architecture overview](../architecture/overview.md)
- [Configuration reference](../reference/configuration.md)
- [Testing and debugging](../guides/testing-and-debugging.md)
