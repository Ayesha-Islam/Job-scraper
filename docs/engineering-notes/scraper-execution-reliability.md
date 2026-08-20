# Engineering note: Scraper reliability comes from bounded execution

## The weak assumption

Running every provider concurrently appears faster, and reusing one broad
execution path appears simpler. In practice, browser-backed providers compete
for memory and pages, one provider error can obscure later results, and an admin
request for one source must not accidentally trigger all sources.

## The change

`ScraperManager` now exposes two explicit paths:

- `runAll()` iterates through configured providers sequentially;
- `runOne(source)` resolves and executes one provider.

Each provider produces its own run result and health data. Errors are isolated
so a failed source does not prevent the remaining sequence from running.
Browser pages and browser instances are closed in `finally` paths. CLI shutdown
also disconnects database and cache clients.

The daily scheduler adds an in-memory `isRunning` guard. The admin controller
uses `runOne()` when a source is supplied and `runAll()` otherwise. Admin routes
require authentication plus the `ADMIN_EMAILS` allowlist.

## Why this is stronger

The design favors a bounded, inspectable failure domain over maximum theoretical
throughput:

- at most one configured provider is orchestrated at a time;
- each result identifies its source and counts;
- an individual source can be targeted operationally;
- resource cleanup occurs on both success and failure;
- operational endpoints have a distinct authorization boundary.

## Verification

Tests should prove that:

1. `runOne()` resolves normalized source names and rejects unknown names;
2. a single-source request does not invoke other providers;
3. one provider failure does not stop `runAll()`;
4. pages and browsers close after thrown errors;
5. overlapping scheduler work is rejected in one process;
6. user tokens without allowlist membership receive `403`.

The Phase 1 verification run covers route/authentication behavior and the
repository's scraper and processor tests. Live provider smoke tests remain
necessary for selectors and network behavior.

Repository evidence:

- [`e56bbf5`: prevent one-source execution from triggering every scraper](https://github.com/Ayesha-Islam/Job-scraper/commit/e56bbf5d967c64725b7459da9060772139854420)
- [`59eaaac`: isolate `runOne()` and stabilize database-pool behavior](https://github.com/Ayesha-Islam/Job-scraper/commit/59eaaac86d6111d8e1a8e0edfd86309f41f74b79)
- [Scraper orchestration tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/scrape.test.ts)
- [Admin route integration tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/integration/admin.api.test.ts)

## Remaining limits

The scheduler lock is local to one Node.js process. Multiple API replicas can
still start overlapping scrapes, and a restart loses run state. There is no
durable queue, checkpoint, distributed lease, or retry schedule.

If reliable multi-instance execution becomes a requirement, move orchestration
to a queue with idempotent provider jobs, bounded concurrency, durable attempts,
and an externally visible run record.

## Related

- [Ingestion and data quality](../architecture/ingestion-and-data-quality.md)
- [Authentication](../architecture/authentication.md)
- [Testing and debugging](../guides/testing-and-debugging.md)
- [Verification evidence](../evidence/verification.md)
- [Standalone scraper dependency container](standalone-scraper-dependency-container.md)
