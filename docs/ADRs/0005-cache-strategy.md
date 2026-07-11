# ADR-0005: Redis Cache Strategy

**Status:** Accepted

**Date:** June 2026

**Decision Makers:** JobScraper Architecture

---

# Context

JobScraper continuously ingests jobs from multiple providers while simultaneously serving search requests to users.

These workloads have different characteristics.

The ingestion pipeline performs:

* Scheduled scraping
* Validation
* Semantic deduplication
* Description enrichment
* Database persistence

The search API performs:

* Keyword search
* Filtering
* Pagination
* Sorting
* Aggregate counts

As the number of stored jobs grows, repeatedly executing identical search queries directly against PostgreSQL increases database load and response time.

A caching strategy was required to improve read performance without affecting data integrity.

---

# Problem

Many search requests are repetitive.

Examples include:

* First page of jobs
* Recent jobs
* Popular searches
* Frequently applied filters

Without caching, every request follows the same execution path.

```text id="mjlwm1"
Client

↓

Backend

↓

PostgreSQL

↓

Response
```

Even when two requests are identical, PostgreSQL must execute the query each time.

This produces unnecessary work and increases latency.

---

# Decision

JobScraper introduces Redis as a **read-through cache** positioned between the search layer and PostgreSQL.

Search requests follow this workflow.

```text id="jlwm2a"
Client

↓

Search Service

↓

Redis

↓

PostgreSQL

↓

Redis

↓

Client
```

The cache stores query results rather than application state.

Redis is never treated as the system of record.

---

# Rationale

The project has one authoritative data source:

> PostgreSQL.

Redis exists solely to reduce the cost of repeated read operations.

Advantages include:

* Faster repeated queries
* Lower PostgreSQL load
* Reduced response latency
* Better scalability for read-heavy workloads

Keeping PostgreSQL as the source of truth preserves consistency while allowing Redis to optimize performance.

---

# Alternatives Considered

## Alternative 1 — PostgreSQL Only

Advantages

* Simple architecture
* No additional infrastructure
* Single persistence layer

Disadvantages

* Repeated execution of identical queries
* Higher database load
* Increased response latency
* Reduced scalability

Decision:

**Rejected**

---

## Alternative 2 — Cache Entire Database

Advantages

* Very fast reads

Disadvantages

* Large memory footprint
* Complex synchronization
* Frequent invalidation
* Data duplication

Decision:

**Rejected**

---

## Alternative 3 — Read-Through Redis Cache

Advantages

* Simple invalidation
* Lower database load
* Faster repeated queries
* Small memory footprint
* Easy operational model

Disadvantages

* Cache misses still require database queries
* Additional infrastructure
* Cache management logic

Decision:

**Accepted**

---

# Cache Responsibilities

Redis is responsible for:

* Search result caching
* Frequently repeated query caching
* Temporary read optimization

Redis is **not** responsible for:

* Permanent storage
* Authentication
* Job persistence
* Semantic deduplication
* Scraping state

These responsibilities remain with PostgreSQL and the application layer.

---

# Cache Lifecycle

A typical request follows this sequence.

```text id="jlwm3a"
Client

↓

Search Request

↓

Redis Lookup

↓

Cache Hit?

↓

Yes → Return Cached Result

↓

No

↓

Query PostgreSQL

↓

Store Result

↓

Return Response
```

This pattern minimizes repeated database work while keeping application behavior deterministic.

---

# Cache Invalidation

Cached data becomes stale whenever the underlying dataset changes.

Examples include:

* New scraping run
* Updated jobs
* Deleted jobs
* Provider refresh

After these operations, affected cache entries should be invalidated.

The next request repopulates the cache from PostgreSQL.

This keeps cache management simple and predictable.

---

# Why the Scraper Never Writes to Redis

The scraper writes exclusively to PostgreSQL.

Reasons include:

* Single source of truth
* Simpler consistency model
* Clear separation of responsibilities

Redis should never become another persistence layer.

The search subsystem determines when cached data should be refreshed.

---

# Why Search Owns the Cache

Caching is implemented within the search layer because search is the primary consumer of repeated read operations.

Benefits include:

* Cache logic remains localized.
* Scrapers remain unaware of caching.
* Persistence remains unchanged.
* Search behavior is easier to optimize independently.

This separation keeps the ingestion pipeline focused solely on acquiring and storing data.

---

# Consequences

Positive

* Faster repeated searches.
* Lower PostgreSQL utilization.
* Improved response times.
* Better scalability under read-heavy workloads.
* Clear separation between persistence and caching.

Negative

* Additional infrastructure.
* Cache invalidation must be maintained.
* Cache misses still require database access.

These trade-offs were accepted because the operational complexity is relatively small compared to the performance gains.

---

# Engineering Principles

## PostgreSQL Is the Source of Truth

Every permanent record originates from PostgreSQL.

Redis stores temporary copies only.

---

## Cache Is an Optimization

Application correctness must never depend on Redis.

The application must function correctly even if the cache is unavailable.

Redis improves performance rather than correctness.

---

## Keep Responsibilities Separate

The ingestion pipeline should never manage cache state.

Search owns caching because search benefits from it.

This minimizes coupling between write and read paths.

---

## Prefer Deterministic Invalidation

Cache invalidation is triggered by known data changes rather than relying solely on expiration.

Explicit invalidation keeps cached results aligned with the underlying dataset.

---

# Lessons Learned

Introducing Redis significantly reduced the cost of frequently repeated search requests while leaving the persistence model unchanged.

Separating caching from scraping also simplified debugging because cache-related issues could be investigated independently of provider extraction and database persistence.

Maintaining PostgreSQL as the single source of truth proved valuable because Redis could be restarted or cleared at any time without risking data loss.

---

# Future Considerations

This decision should be revisited if:

* Full-text search is moved to a dedicated search engine.
* Distributed caching is introduced.
* Query traffic increases substantially.
* Additional cache layers (such as CDN edge caching) become part of the architecture.

The current design intentionally keeps Redis independent of persistence so future caching technologies can replace it with minimal impact on the remainder of the application.

---

# Related Documents

* Architecture → Caching
* Architecture → Search System
* Architecture → Backend
* Guide → Local Development
* Guide → Docker
* Reference → Environment Variables
* ADR-0001: Prisma vs Raw PostgreSQL (`pg`)
