# ADR 0003: Cache-aside Redis

- **Status:** Accepted
- **Scope:** Read performance

## Context

Job lists, details, and statistics are read repeatedly but change less often
than they are requested. Caching can reduce PostgreSQL work, but making Redis
authoritative would add consistency and recovery risks that the project does not
need.

## Decision

Use Redis as a cache-aside layer:

1. read the cache;
2. on a miss, query PostgreSQL;
3. return the database result;
4. store it with a bounded TTL;
5. invalidate related keys after a write.

PostgreSQL remains the only durable authority. After the API has started,
Redis operation failures fall back to the database or make cache writes no-ops.
The current API bootstrap still treats failure of the initial Redis connection
as fatal; the standalone scraper catches that failure and continues.

Current TTLs are 300 seconds for job lists, 600 seconds for job detail, and
1,800 seconds for statistics.

## Consequences

Benefits:

- repeat reads are cheaper;
- cache loss does not lose application data;
- cached data can be dropped without losing durable application state;
- stale-data windows are bounded and explicit.

Costs:

- callers can see stale results within the TTL;
- every result-changing parameter must be present in the cache key;
- writes must invalidate multiple key families;
- pattern invalidation currently uses Redis `KEYS`, which will not scale to a
  large keyspace.

## Evidence

- Cache implementation: `api/src/cache.ts`
- Cached operations: `api/src/services/job.svc.ts`
- Configuration: [Configuration reference](../reference/configuration.md)

## Revisit when

Replace broad invalidation if the keyspace grows materially. Consider versioned
keys, explicit key sets, or `SCAN`. Reconsider the TTLs when production latency,
hit-rate, and acceptable-staleness data exists.

## Related

- [Search and caching](../architecture/search-and-caching.md)
