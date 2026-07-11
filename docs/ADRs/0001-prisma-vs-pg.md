# ADR-0001: Prisma vs Raw PostgreSQL (`pg`)

**Status:** Accepted

**Date:** June 2026

**Decision Makers:** JobScraper Architecture

---

# Context

JobScraper stores all persistent data inside PostgreSQL.

During the initial implementation, a key architectural question emerged:

> **Should the application use Prisma for every database interaction, or should it combine Prisma with raw SQL?**

At first glance, using a single ORM throughout the application appears simpler.

It provides:

* Consistent abstractions
* Type safety
* Migration management
* Reduced SQL

However, the application consists of two fundamentally different workloads:

1. Relational CRUD operations
2. High-volume search operations

Treating these workloads identically would introduce unnecessary complexity.

---

# Problem

Authentication and user management primarily perform relational operations.

Typical examples include:

* Find user by email
* Create user
* Validate credentials
* Retrieve saved jobs
* Create relationships

These operations map naturally to an ORM.

Search behaves very differently.

Search requests may combine:

* Optional filters
* Pagination
* Sorting
* Aggregate counts
* Dynamic WHERE clauses
* Dynamic ORDER BY clauses

Attempting to express these queries entirely through ORM abstractions quickly becomes difficult to maintain.

---

# Decision

JobScraper adopts a **hybrid persistence strategy**.

Prisma is used for relational CRUD operations.

Raw PostgreSQL (`pg`) is used for dynamic search queries.

Responsibilities are intentionally divided.

## Prisma

Used for:

* Authentication
* Users
* Saved Jobs
* Schema management
* Migrations
* Relationships

---

## Raw PostgreSQL

Used for:

* Search
* Filtering
* Pagination
* Sorting
* Aggregate queries

The application therefore uses each tool where it provides the greatest value.

---

# Rationale

Different database workloads have different optimization goals.

Authentication benefits from:

* Relationship management
* Type-safe CRUD
* Stable schemas
* Migration tooling

Search benefits from:

* Explicit SQL
* Dynamic query generation
* Predictable execution plans
* Easier optimization

Using both technologies provides the strengths of each while avoiding their respective weaknesses.

---

# Alternatives Considered

## Alternative 1 — Prisma Only

Advantages

* Single persistence technology
* Consistent developer experience
* Excellent type safety

Disadvantages

* Dynamic search queries become verbose.
* SQL generation becomes less transparent.
* Performance tuning becomes more difficult.
* Complex filtering requires increasingly nested query objects.

Decision:

**Rejected**

---

## Alternative 2 — Raw SQL Only

Advantages

* Complete SQL control
* Predictable execution
* Maximum flexibility

Disadvantages

* Manual relationship management
* Additional boilerplate
* Increased maintenance
* More repetitive CRUD code

Decision:

**Rejected**

---

## Alternative 3 — Query Builder

Examples:

* Knex
* Kysely

Advantages

* More expressive than raw SQL
* Better abstraction

Disadvantages

* Additional dependency
* Less transparent SQL
* Limited benefit over explicit SQL

Decision:

**Rejected**

---

# Consequences

Positive

* Search queries remain easy to optimize.
* Authentication remains simple.
* Prisma migrations continue managing schema evolution.
* Business logic remains independent of persistence technology.

Negative

* Two database access strategies must be understood.
* Developers should know when to use each approach.
* Additional documentation is required.

The trade-off was considered worthwhile because the workloads differ significantly.

---

# Implementation

The separation is reflected directly in the project structure.

```text
Authentication

↓

Prisma

↓

PostgreSQL
```

Search follows a different path.

```text
Search Request

↓

job.svc.ts

↓

job.sql.ts

↓

pg Pool

↓

PostgreSQL
```

The two persistence mechanisms operate against the same database while serving different architectural responsibilities.

---

# Design Principles

This decision follows several engineering principles.

## Use the Right Tool

A technology should be selected based on workload characteristics rather than consistency alone.

---

## Separate Responsibilities

Authentication and search solve different problems.

They should not be forced into identical implementations.

---

## Optimize the Critical Path

Search represents the most frequently executed workload.

Optimizing this path provides greater value than optimizing infrequent CRUD operations.

---

## Maintain Explicit Boundaries

Prisma and raw SQL should never become intermixed within the same service.

Each service should clearly own one persistence strategy.

---

# Lessons Learned

Initially, Prisma appeared capable of handling every database operation.

As the search subsystem evolved to support filtering, sorting, pagination, and aggregation, handcrafted SQL became substantially easier to understand and maintain.

Rather than abandoning Prisma, the architecture evolved toward specialization.

This resulted in:

* Simpler authentication code
* Cleaner search implementation
* Better separation of concerns
* More predictable performance

---

# Future Considerations

This decision should be revisited if:

* PostgreSQL Full-Text Search is introduced.
* Search moves to Elasticsearch.
* Query complexity decreases significantly.
* Prisma introduces capabilities that substantially simplify dynamic SQL generation.

Until then, the hybrid persistence strategy remains the preferred architecture.

---

# Related Documents

* Architecture → Backend
* Architecture → Database Design
* Architecture → Search System
* Reference → Database Schema
* Guide → Prisma Migrations
