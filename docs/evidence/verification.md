# Verification evidence

This page separates measured or repository-backed evidence from architectural
intent. It is a snapshot of the reviewed working tree on 18 August 2026, not a
service-level guarantee.

## Automated verification

| Check | Result | Command |
|---|---:|---|
| Backend test files | 17 passed | `cd api && npm test` |
| Backend tests | 126 passed | `cd api && npm test` |
| Backend TypeScript compiler check (`tsc --noEmit`) | Passed | `cd api && npm run build` |
| Frontend TypeScript check | Passed | `cd frontend && npm run type-check` |
| Frontend production build | Passed | `cd frontend && npm run build` |
| Documentation links | 21 files checked; no broken relative links | Local link checker |

The test-suite foundation was introduced in
[`a1bf17d`](https://github.com/Ayesha-Islam/Job-scraper/commit/a1bf17d30d3d64d69e8d5a8c4bd737f8db26ef3f).
Current test files include:

- [processor regression tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/job.processor.test.ts);
- [deduplication and persistence tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/job.svc.test.ts);
- [SQL construction tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/job.sql.test.ts);
- [scraper orchestration tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/scrape.test.ts);
- [API route integration tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/integration/api.routes.test.ts);
- [admin authorization integration tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/integration/admin.api.test.ts).

These tests use mocks and fixtures. They verify application behavior, not the
continued availability or markup stability of external providers.

## Representative scrape snapshot

The repository history contains an actual JSON export captured on 26 February
2026 and committed with the description-cleanup work in
[`e9ec743`](https://github.com/Ayesha-Islam/Job-scraper/commit/e9ec74380f8e3f0bbad07f6c6e0e4ab3228976ef).

Only aggregate values are reproduced here. Job titles, company names,
application URLs, descriptions, and tracking values are deliberately omitted.

| Measure | Sanitized result |
|---|---:|
| Candidate records | 190 |
| Sources represented | 9 |
| Records without descriptions | 4 |
| Records without salary data | 135 |
| Median description length | 1,636 characters |
| Mean description length | 2,372 characters |
| Maximum description length | 15,029 characters |
| Repeated normalized company/title/location keys | 5 |
| Repeated source hashes | 0 |

### Interpretation

This is historical baseline evidence, not a current production scrape. The
snapshot predates the final shared processor and includes providers that are no
longer in the default registry.

It supports three narrower conclusions:

1. missing descriptions were present in real extracted data;
2. description length varied enough that length alone was not a safe quality
   measure;
3. source hashes did not reveal duplicates that appeared under a normalized
   business key.

Those observations motivated description-quality checks and deterministic
cross-source deduplication. They do not prove current provider success rates.

## Description-cleaning microbenchmark

Run:

```bash
cd api
npm run benchmark:descriptions
```

The benchmark uses four deterministic synthetic samples, warms up the JavaScript
runtime, and records the median of eight rounds with 25,000 operations each.

Result from the reviewed environment:

| Field | Value |
|---|---|
| Runtime | Node.js v24.19.0, Linux x64 |
| CPU | Intel Xeon Platinum 8370C |
| Median round | 368.66 ms for 25,000 operations |
| Median throughput | 67,813 cleanup operations/second |
| Measured scope | `cleanDescription()` CPU work only |

The benchmark script is
`api/scripts/benchmark-description-cleaning.ts`.

### What this benchmark does not prove

It excludes HTTP requests, browser startup, provider rate limits, enrichment,
PostgreSQL, Redis, serialization, and frontend rendering. It therefore cannot
support claims about API latency, scrape duration, search performance, or
production capacity.

Search still uses leading-wildcard `ILIKE`, and no database benchmark is
included. The project deliberately makes no “high-performance search” claim.

## Commit-to-claim traceability

| Engineering claim | Repository evidence |
|---|---|
| Description noise and null content required cleanup | [`e9ec743`](https://github.com/Ayesha-Islam/Job-scraper/commit/e9ec74380f8e3f0bbad07f6c6e0e4ab3228976ef) |
| Enrichment, validation, and persistence were centralized | [`99b6567`](https://github.com/Ayesha-Islam/Job-scraper/commit/99b6567776cfa3a640f18c479bac1bbdb95fe68f) |
| Description extraction received source-specific hardening | [`cbc8e6f`](https://github.com/Ayesha-Islam/Job-scraper/commit/cbc8e6f16d97612a2a03c90e5730ef77b7f41562) |
| `runOne()` was separated from all-provider execution | [`e56bbf5`](https://github.com/Ayesha-Islam/Job-scraper/commit/e56bbf5d967c64725b7459da9060772139854420), [`59eaaac`](https://github.com/Ayesha-Islam/Job-scraper/commit/59eaaac86d6111d8e1a8e0edfd86309f41f74b79) |
| Database uniqueness and API test coverage were committed | [`a1bf17d`](https://github.com/Ayesha-Islam/Job-scraper/commit/a1bf17d30d3d64d69e8d5a8c4bd737f8db26ef3f) |

Commit messages describe the intended changes. The automated checks above are
the stronger evidence that the reviewed working tree still builds and passes.

## Reproduction limits

- External pages can change after this evidence was collected.
- Microbenchmark numbers vary by CPU, runtime, power state, and system load.
- The reviewed environment did not provide a live PostgreSQL/Redis benchmark
  stack, so no database or cache latency numbers are claimed.
- A live scrape should be run conservatively and only after reviewing each
  provider's current terms and crawler policy.
