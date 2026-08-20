# Engineering note: Cross-source deduplication needs a business key

## The weak assumption

Using a listing URL as identity seems natural, but URLs describe publication,
not necessarily the underlying opening. Tracking parameters change, providers
repost roles, and the same opening can appear on multiple boards.

URL identity therefore produced duplicate records and prevented predictable
updates.

## The change

The pipeline creates three normalized values:

```text
companyKey
positionKey
locationKey
```

Company and position are trimmed and lowercased. Location receives additional
normalization so common remote variants converge. PostgreSQL enforces a unique
constraint across all three fields.

Persistence first looks for that business key. A match becomes an update path,
where useful incoming fields—including a better description—can improve the
record. A miss becomes an insert. The database constraint remains the final
boundary if concurrent writers race.

Relevant code:

- `api/src/services/job.processor.ts`
- `api/src/services/job.svc.ts`
- `api/prisma/schema.prisma`

## Why deterministic beats “smart” here

A deterministic key is explainable in an incident and reproducible in a test.
Semantic similarity would require a threshold, labeled evaluation data, and a
recovery process for false merges. The project does not yet have enough evidence
to justify that operational cost.

## Verification

A useful second-run test is:

1. ingest a role;
2. ingest it again with a changed URL;
3. confirm the row count remains one;
4. confirm newer useful attributes can update;
5. ingest a different normalized location and confirm it remains distinct.

Automated processor and service tests cover key construction, duplicate
handling, and update behavior.

Repository evidence:

- [`a1bf17d`: commit the composite uniqueness migration and test suite](https://github.com/Ayesha-Islam/Job-scraper/commit/a1bf17d30d3d64d69e8d5a8c4bd737f8db26ef3f)
- [Persistence and deduplication tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/job.svc.test.ts)
- [Composite-key migration](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/prisma/migrations/20260607191600_semantic_dedup/migration.sql)

The migration retains its historical `semantic_dedup` directory name. The
implemented algorithm is deterministic key matching, not semantic similarity.

## Remaining limits

The key can collapse separate openings with the same company, title, and
location. It can also miss duplicates when companies use aliases or titles vary
slightly. These are known boundaries, not evidence that an opaque similarity
score would be safer.

A future provider requisition ID would be stronger evidence and could be stored
alongside the current key. Any key change needs a database migration and a
reconciliation plan.

## Related

- [ADR 0002](../decisions/0002-deterministic-deduplication.md)
- [Database reference](../reference/database.md)
- [Verification evidence](../evidence/verification.md)
