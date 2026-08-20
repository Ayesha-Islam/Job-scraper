# ADR 0002: Deterministic deduplication

- **Status:** Accepted
- **Scope:** Job identity

## Context

Listing URLs are unstable identifiers. Providers add tracking parameters,
change routes, and may expose the same role through different pages. Treating
the URL as identity produced duplicate jobs and made updates unpredictable.

Semantic similarity was considered, but it would introduce thresholds and
false-positive merges that are difficult to explain or reverse.

## Decision

Define job identity as the composite of:

```text
lowercase(company) + lowercase(position) + normalized(location)
```

Store the components as `companyKey`, `positionKey`, and `locationKey`. Enforce
their uniqueness in PostgreSQL and use the same rule in the processing path.
Treat URL, source, salary, and description as attributes that may change.

When an incoming job matches an existing key, update the record where the new
data is useful rather than creating a second row.

## Consequences

Benefits:

- identity is deterministic and testable;
- duplicate prevention survives concurrent writes;
- changed tracking URLs do not create new jobs;
- cross-source matches do not require a probabilistic service.

Costs:

- two real openings with the same company, title, and location may collapse;
- company aliases and title spelling differences can remain separate;
- normalization rules become part of the data contract;
- changing the key requires a migration and reconciliation.

## Evidence

- Constraint: `api/prisma/schema.prisma`
- Key construction and processing: `api/src/services/job.processor.ts`
- Persistence: `api/src/services/job.svc.ts`

## Revisit when

Reconsider if the system gains provider-stable requisition IDs, must preserve
multiple identical openings, or has enough labeled data to evaluate a more
nuanced entity-resolution model.

## Related

- [Ingestion and data quality](../architecture/ingestion-and-data-quality.md)
- [Cross-source deduplication](../engineering-notes/cross-source-deduplication.md)
