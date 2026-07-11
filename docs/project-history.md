# Project History

## Overview

JobScraper began as a simple experiment in collecting remote job listings from publicly available job boards.

Over time, the project evolved into a production-oriented job aggregation platform through a series of architectural improvements driven by real engineering problems.

Rather than adding technologies for their own sake, each phase introduced a solution to a specific limitation discovered during development.

This document describes that evolution.

---

# Phase 1 — Single-Provider Job Scraper

## Goal

Build a scraper capable of collecting remote job listings from a single source.

The initial implementation focused on proving that job data could be extracted, normalized, and displayed within a web application.

The architecture at this stage consisted primarily of:

```text
Provider

↓

Database

↓

Frontend
```

Although functional, the implementation exposed several limitations as additional providers were considered.

---

# Phase 2 — Multi-Provider Aggregation

## Problem

Each provider exposed data differently.

Differences included:

* HTML structure
* Pagination
* Detail pages
* Data quality
* Navigation

Adding another provider required modifying existing scraper logic.

The architecture did not scale.

---

## Solution

A provider-based architecture was introduced.

Each provider became an independent extraction module while sharing a common processing pipeline.

```text
Scheduler

↓

Provider

↓

Processing Pipeline
```

This change established clear boundaries between extraction and business logic.

---

# Phase 3 — Semantic Deduplication

## Problem

As providers were added, identical jobs began appearing multiple times.

The same vacancy frequently existed on:

* LinkedIn
* RemoteOK
* We Work Remotely
* RemoteHub

URL-based uniqueness treated each listing as a different job.

Search results became cluttered with duplicates.

---

## Solution

The application introduced semantic deduplication.

Jobs became uniquely identified by:

```text
companyKey

+

positionKey

+

locationKey
```

A composite unique constraint was added to PostgreSQL, ensuring that logical job opportunities—not provider URLs—became the unit of uniqueness.

This significantly improved search quality.

---

# Phase 4 — Description Enrichment

## Problem

Provider descriptions varied dramatically.

Common issues included:

* Truncated descriptions
* Login pages
* Navigation wrappers
* Empty content
* HTML artifacts

Persisting raw provider output reduced the quality of stored data.

---

## Solution

A shared description enrichment pipeline was introduced.

Every description now passes through:

```text
Extraction

↓

Cleaning

↓

Validation

↓

Persistence
```

Providers became responsible only for extraction.

Quality validation became centralized.

This improved consistency across every provider.

---

# Phase 5 — Monitoring and Operational Visibility

## Problem

As the number of providers increased, debugging became more difficult.

When scraping failed, it was often unclear whether the issue involved:

* Extraction
* Validation
* Enrichment
* Persistence
* Provider availability

Diagnosing failures required manually inspecting logs.

---

## Solution

The scraper introduced provider-level monitoring.

Each execution now reports metrics such as:

* Jobs discovered
* Jobs accepted
* Jobs rejected
* Execution duration
* Warning count
* Health status

These metrics transformed troubleshooting from reactive log inspection into structured operational analysis.

---

# Phase 6 — Authentication and User Features

## Problem

The application initially functioned only as a public job search interface.

There was no concept of user identity or personalized functionality.

---

## Solution

Authentication was introduced as an isolated subsystem.

Responsibilities included:

* User accounts
* Session management
* Protected routes

Authentication remained intentionally separate from the scraping pipeline.

This preserved the independence of the ingestion architecture while enabling future user-specific capabilities.

---

# Phase 7 — Search Optimization

## Problem

As the dataset grew, search queries became increasingly complex.

Supporting:

* Dynamic filtering
* Pagination
* Sorting
* Aggregate counts

through an ORM alone reduced query clarity and limited optimization opportunities.

Repeated searches also placed unnecessary load on PostgreSQL.

---

## Solution

The persistence layer evolved into a hybrid architecture.

Prisma remained responsible for relational CRUD operations.

Dynamic search adopted handcrafted SQL through PostgreSQL's native capabilities.

Redis was introduced as a read-through cache for frequently repeated search requests.

This architecture balanced developer productivity with predictable query performance.

---

# Phase 8 — Engineering Maturity

## Problem

As the project expanded, maintaining consistency across environments became increasingly important.

Contributors required:

* Reliable local setup
* Repeatable database migrations
* Automated testing
* Reproducible infrastructure

---

## Solution

Several engineering improvements were introduced:

* Docker-based development environment
* Prisma migration workflow
* Unit testing
* Integration testing
* Structured documentation
* Architecture Decision Records (ADRs)

These additions improved maintainability and made the project easier to onboard and evolve.

---

# Architectural Evolution

The project evolved through a series of deliberate architectural refinements.

```text
Single Scraper

↓

Multi-Provider Architecture

↓

Semantic Deduplication

↓

Description Enrichment

↓

Monitoring

↓

Authentication

↓

Search Optimization

↓

Docker & Testing

↓

Production-Oriented Architecture
```

Each stage addressed a specific engineering challenge rather than introducing technology for its own sake.

---

# Key Engineering Lessons

Developing JobScraper reinforced several principles.

## Build Around Problems

Major architectural changes were introduced only after identifying concrete limitations.

Technology followed the problem rather than driving it.

---

## Separate Responsibilities

Extraction, validation, enrichment, persistence, search, authentication, and presentation each evolved into distinct subsystems.

This separation reduced coupling and improved maintainability.

---

## Treat External Data as Untrusted

Provider output cannot be assumed correct.

Validation and enrichment became essential components of the ingestion pipeline.

---

## Prefer Shared Infrastructure

Business rules such as validation, semantic deduplication, and enrichment were centralized rather than duplicated across providers.

This reduced maintenance effort while improving consistency.

---

## Optimize Where It Matters

Performance optimizations were introduced only after they addressed measurable workload characteristics.

Examples include:

* Raw SQL for dynamic search
* Redis for repeated queries

The remainder of the application continued to benefit from higher-level abstractions where appropriate.

---

# Current State

Today, JobScraper is a production-oriented job aggregation platform featuring:

* Multi-provider scraping
* Provider isolation
* Shared processing pipeline
* Semantic deduplication
* Description enrichment
* PostgreSQL persistence
* Redis caching
* Authentication
* Automated testing
* Dockerized development
* Comprehensive technical documentation

The project demonstrates not only full-stack implementation skills but also architectural decision-making, operational thinking, and incremental system evolution.

---

# Future Direction

Several enhancements remain possible as the project evolves.

Examples include:

* Additional job providers
* Saved Jobs
* Full-text search
* AI-assisted enrichment
* Distributed scraping
* Provider plugin discovery
* Search engine integration
* Advanced analytics

The existing architecture was intentionally designed so these capabilities can be introduced incrementally without requiring significant structural changes.

---

# Closing Remarks

JobScraper was never intended to be a collection of scraping scripts.

Its evolution reflects a broader goal: building software that remains maintainable as complexity increases.

Each architectural decision was driven by a practical engineering problem, resulting in a system where providers, processing, persistence, search, authentication, and presentation are clearly separated yet work together as a cohesive platform.

The project serves not only as a job aggregation application but also as a demonstration of backend engineering practices, software architecture, and long-term maintainability.
