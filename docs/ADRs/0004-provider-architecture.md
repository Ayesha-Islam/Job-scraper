# ADR-0004: Provider-Based Scraper Architecture

**Status:** Accepted

**Date:** June 2026

**Decision Makers:** JobScraper Architecture

---

# Context

The primary objective of JobScraper is to aggregate remote job listings from multiple independent providers.

Current providers include examples such as:

* LinkedIn
* RemoteOK
* We Work Remotely
* RemoteHub
* NoDesk
* Y Combinator

Each provider differs in:

* HTML structure
* Navigation
* Pagination
* Rate limiting
* Authentication behavior
* Data quality
* Response format

Despite these differences, every provider ultimately produces the same business entity:

> A normalized job listing.

The architecture therefore needed to support heterogeneous data sources without coupling provider-specific logic to the remainder of the application.

---

# Problem

An early implementation option was to create a single scraper containing provider-specific branches.

Conceptually:

```text id="u4n8wr"
Scraper

↓

if LinkedIn

↓

if RemoteOK

↓

if RemoteHub

↓

if WWR

↓

...
```

While simple initially, this architecture becomes increasingly difficult to maintain as providers are added.

Typical consequences include:

* Large conditional blocks
* Duplicated logic
* Shared mutable state
* Difficult testing
* High coupling
* Poor fault isolation

Every new provider increases the complexity of the central scraper.

---

# Decision

JobScraper adopts a **provider-based architecture**.

Each job source is implemented as an independent provider responsible only for acquiring data from its corresponding platform.

All providers participate in the same shared lifecycle.

```text id="o0b13j"
Scheduler

↓

Scrape Coordinator

↓

Provider

↓

Job Processor

↓

Database
```

The provider boundary separates extraction from every other application concern.

---

# Rationale

Providers vary significantly in how data is collected.

Some expose:

* REST APIs
* RSS feeds
* Server-rendered HTML
* Client-rendered applications

The application should not require different processing pipelines for each source.

Instead:

* Extraction remains provider-specific.
* Validation is shared.
* Deduplication is shared.
* Enrichment is shared.
* Persistence is shared.
* Monitoring is shared.

This architecture minimizes duplicated business logic.

---

# Alternatives Considered

## Alternative 1 — Single Scraper

Advantages

* Minimal initial implementation
* Few files
* Simple for one provider

Disadvantages

* Large conditional blocks
* Poor scalability
* Difficult debugging
* High coupling
* Increasing maintenance cost

Decision:

**Rejected**

---

## Alternative 2 — Provider Modules with Shared Pipeline

Advantages

* Independent providers
* Shared processing
* Easier testing
* Better fault isolation
* Simple provider onboarding

Disadvantages

* Slightly more initial structure
* Requires clear provider contracts

Decision:

**Accepted**

---

## Alternative 3 — Independent Pipelines Per Provider

Each provider owns its complete processing pipeline.

Advantages

* Maximum flexibility

Disadvantages

* Extensive duplication
* Inconsistent validation
* Difficult maintenance
* Divergent behavior between providers

Decision:

**Rejected**

---

# Consequences

Positive

* New providers can be added without modifying existing providers.
* Shared improvements benefit every provider automatically.
* Failures remain isolated to individual providers.
* Business rules remain centralized.
* Providers are easier to test independently.

Negative

* Requires a stable provider contract.
* Shared processing must remain provider-agnostic.
* Additional coordination is required during orchestration.

These trade-offs were accepted because they significantly improve long-term maintainability.

---

# Provider Responsibilities

Every provider is responsible for:

* Connecting to its source
* Navigating pagination
* Extracting listings
* Normalizing provider values
* Returning normalized jobs

Providers intentionally avoid responsibilities outside data acquisition.

---

# Shared Responsibilities

The shared pipeline performs:

* Validation
* Semantic deduplication
* Description enrichment
* Persistence
* Monitoring
* Metrics aggregation

Every provider benefits from these capabilities without implementing them independently.

---

# Fault Isolation

A provider failure should not terminate the scraping cycle.

Example:

```text id="zwnwvk"
LinkedIn

✓

RemoteOK

✓

RemoteHub

✗

WWR

✓
```

The coordinator records the RemoteHub failure while allowing the remaining providers to complete successfully.

This improves operational reliability and prevents one unstable source from affecting the entire aggregation process.

---

# Extensibility

Adding a new provider typically requires:

1. Implement extraction logic.
2. Register the provider.
3. Execute a scraping run.

No modifications are required to:

* Validation
* Deduplication
* Search
* Persistence
* Monitoring

This significantly reduces the effort required to integrate additional job sources.

---

# Testing

The provider architecture simplifies testing.

Each provider can be verified independently.

Examples include:

* Extraction correctness
* Pagination behavior
* Selector accuracy
* Error handling

Shared business rules are tested separately within the processing pipeline.

This separation reduces duplicated tests and improves confidence in both extraction and processing.

---

# Monitoring

Provider-level isolation also enables provider-level monitoring.

Each provider reports metrics such as:

* Jobs discovered
* Jobs accepted
* Jobs rejected
* Execution duration
* Warning count
* Health status

These metrics make it possible to identify provider-specific regressions without affecting operational visibility for other sources.

---

# Engineering Principles

## Single Responsibility

Providers acquire data.

They do not process, validate, or persist it.

---

## Open for Extension

New providers extend the system without requiring modification of existing providers or the processing pipeline.

---

## Shared Business Rules

Validation, enrichment, and persistence remain centralized.

Consistency is maintained across every provider.

---

## Failure Containment

Failures remain localized.

One provider should never prevent the remainder of the scraping cycle from completing.

---

# Lessons Learned

As additional providers were introduced, differences in HTML structure, pagination, and content quality increased substantially.

Maintaining independent providers while centralizing processing proved to be significantly easier than expanding a monolithic scraper.

Provider isolation also simplified debugging because operational issues could be traced directly to the affected source without impacting unrelated providers.

---

# Future Considerations

This decision should be revisited if:

* Providers begin exposing standardized APIs.
* Distributed scraping workers are introduced.
* Providers execute in parallel across multiple processes.
* A plugin discovery mechanism replaces manual provider registration.

The current provider architecture already provides a natural foundation for these enhancements because providers are independent execution units.

---

# Related Documents

* Architecture → Scraper Engine
* Architecture → Job Processing Pipeline
* Guide → Adding a New Provider
* Guide → Debugging Scrapers
* Reference → Scraper Interface
* ADR-0002: Semantic Deduplication
* ADR-0003: Description Enrichment
