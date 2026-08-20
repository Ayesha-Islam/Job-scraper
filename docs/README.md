# JobScraper Documentation

JobScraper is a full-stack remote-job aggregator built around a data-quality problem: different job boards describe the same vacancy in incompatible and sometimes unreliable ways.

The documentation is organized by reader need. Start with the case study for the project story, use architecture pages to understand the system, follow guides to complete tasks, and use reference pages for exact contracts.

## Start here

- [Project case study](case-study.md) — the problem, decisions, outcomes, and limitations.
- [Architecture overview](architecture/overview.md) — system boundaries and request/data flows.
- [Local development](guides/local-development.md) — run the project locally or with Docker.
- [REST API reference](reference/api.md) — exact backend routes and response envelopes.
- [Verification evidence](evidence/verification.md) — tests, commits, sanitized scrape data, and benchmark scope.

## Architecture

- [Architecture overview](architecture/overview.md)
- [Ingestion and data quality](architecture/ingestion-and-data-quality.md)
- [Search and caching](architecture/search-and-caching.md)
- [Authentication](architecture/authentication.md)

## Decisions

- [ADR 0001: Prisma and raw SQL](decisions/0001-prisma-and-raw-sql.md)
- [ADR 0002: Deterministic deduplication](decisions/0002-deterministic-deduplication.md)
- [ADR 0003: Cache-aside Redis](decisions/0003-cache-aside-redis.md)

## Guides

- [Local development and Docker](guides/local-development.md)
- [Adding a provider](guides/adding-a-provider.md)
- [Testing and debugging](guides/testing-and-debugging.md)

## Reference

- [REST API](reference/api.md)
- [Database schema](reference/database.md)
- [Configuration](reference/configuration.md)

## Engineering notes

These are development case studies, not production incident reports.

- [Description quality](engineering-notes/description-quality.md)
- [Cross-source deduplication](engineering-notes/cross-source-deduplication.md)
- [Scraper execution reliability](engineering-notes/scraper-execution-reliability.md)
- [Standalone scraper dependency container](engineering-notes/standalone-scraper-dependency-container.md)

## Evidence

- [Verification evidence](evidence/verification.md)

## Documentation conventions

- **Architecture** explains how the implemented system fits together.
- **Decisions** record a choice, its context, and its consequences.
- **Guides** provide steps for completing a task.
- **Reference** states exact implemented behavior.
- **Engineering notes** explain a real development problem and how it was verified.

Planned capabilities are labeled as planned. Experimental sources are labeled as experimental. Performance and reliability claims require measured evidence.
