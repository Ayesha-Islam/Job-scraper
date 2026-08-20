# ADR 0001: Prisma for schema management, raw SQL for search

- **Status:** Accepted
- **Scope:** Database access

## Context

The application needs ordinary model operations and a search endpoint with
optional filters, case-insensitive matching, counting, ordering, and pagination.
Using one abstraction for both concerns made the dynamic search query harder to
read and verify.

## Decision

Use Prisma for:

- the PostgreSQL schema and migrations;
- generated types and client access;
- conventional create, update, delete, and relation operations.

Use parameterized raw SQL in `api/src/lib/job.sql.ts` for the search and
filter query. Keep every caller-controlled value in a query parameter and keep
the result-count filters aligned with the row-query filters.

## Consequences

Benefits:

- schema evolution remains typed and repeatable;
- search behavior is visible as SQL;
- PostgreSQL features such as `ILIKE` are straightforward;
- query plans can be inspected without reconstructing generated ORM behavior.

Costs:

- raw results require explicit typing;
- column and table changes must also update the SQL;
- tests must protect against filter drift and unsafe interpolation;
- maintainers need both Prisma and SQL fluency.

## Evidence

- Schema: `api/prisma/schema.prisma`
- Search: `api/src/lib/job.sql.ts`
- Tests: `api/tests/`

## Revisit when

Reconsider if search moves to a dedicated engine, Prisma can express the query
more clearly without losing auditability, or the SQL becomes large enough to
need its own query layer.

## Related

- [Search and caching](../architecture/search-and-caching.md)
- [Database reference](../reference/database.md)
