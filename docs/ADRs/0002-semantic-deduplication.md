# ADR-0002: Semantic Deduplication

**Status:** Accepted

**Date:** June 2026

**Decision Makers:** JobScraper Architecture

---

# Context

JobScraper aggregates listings from multiple independent job providers.

Examples include:

* LinkedIn
* RemoteOK
* We Work Remotely
* RemoteHub
* Y Combinator
* NoDesk

The same vacancy frequently appears on several providers simultaneously.

Each provider assigns:

* Different URLs
* Different identifiers
* Different formatting
* Different publication timestamps

Treating these listings as independent jobs would significantly reduce search quality.

---

# Problem

Traditional deduplication strategies identify duplicates using provider-specific identifiers.

Examples include:

* URL
* Provider Job ID
* URL hash

These approaches assume that every provider references the same vacancy using the same identifier.

This assumption is false.

Example:

```text id="z0c5zy"
LinkedIn

https://linkedin.com/jobs/123

↓

RemoteOK

https://remoteok.com/987

↓

We Work Remotely

https://weworkremotely.com/456
```

Although these URLs differ, they may all represent the same position.

URL-based uniqueness therefore produces duplicate jobs within the application.

---

# Decision

JobScraper identifies duplicate jobs using **business identity** rather than provider identity.

A job is uniquely identified by the normalized combination of:

```text id="91dsgm"
companyKey

+

positionKey

+

locationKey
```

This composite business key is enforced through a database constraint.

```text id="kekehn"
@@unique([
    companyKey,
    positionKey,
    locationKey
])
```

This definition reflects how users perceive jobs rather than how providers publish them.

---

# Rationale

Users do not care whether a vacancy originates from:

* LinkedIn
* RemoteOK
* RemoteHub

They care whether it represents a different opportunity.

Two listings describing:

```text id="9mjlwm"
OpenAI

Backend Engineer

Remote (US)
```

should appear once regardless of how many providers publish them.

Semantic uniqueness aligns the data model with user expectations.

---

# Normalization

Before uniqueness is evaluated, provider values are normalized.

Examples include:

Company:

```text id="5x5vkr"
Microsoft

MICROSOFT

Microsoft Corporation

↓

microsoft
```

Position:

```text id="j0dk7g"
Senior Backend Engineer

Senior Backend Engineer

↓

senior backend engineer
```

Location:

```text id="z72w2s"
United States

USA

US Remote

Remote (US)

↓

remote-us
```

Normalization ensures equivalent values produce identical semantic keys.

---

# Alternatives Considered

## Alternative 1 — URL Uniqueness

Advantages

* Extremely simple
* Provider independent
* Easy to implement

Disadvantages

* Same vacancy appears multiple times.
* Different providers always produce different URLs.
* Poor search experience.

Decision:

**Rejected**

---

## Alternative 2 — Provider Job ID

Advantages

* Stable within a provider
* Fast lookup

Disadvantages

* IDs are not shared between providers.
* Duplicate listings remain.

Decision:

**Rejected**

---

## Alternative 3 — Full Description Hash

Advantages

* Ignores provider identifiers

Disadvantages

* Minor formatting changes produce different hashes.
* Descriptions frequently differ across providers.
* Enrichment modifies descriptions.

Decision:

**Rejected**

---

## Alternative 4 — Semantic Identity

Advantages

* Represents the underlying business entity.
* Provider independent.
* Stable across multiple sources.
* Better user experience.

Disadvantages

* Requires normalization.
* Slightly more implementation complexity.

Decision:

**Accepted**

---

# Consequences

Positive

* Duplicate jobs are significantly reduced.
* Search results become cleaner.
* Provider overlap improves rather than pollutes the dataset.
* Users see opportunities rather than webpages.

Negative

* Normalization becomes critical.
* Poor normalization can incorrectly merge unrelated jobs.
* Additional preprocessing is required before persistence.

These trade-offs were considered acceptable because they substantially improve overall data quality.

---

# Implementation

The deduplication process follows this sequence.

```text id="ov18ux"
Provider

↓

Extract Job

↓

Normalize

↓

Generate

companyKey

positionKey

locationKey

↓

Database Constraint

↓

Persist
```

If an identical semantic key already exists, the new listing is treated as an existing job rather than a new record.

---

# Database Enforcement

Semantic uniqueness is enforced at the database level rather than solely in application code.

Reasons include:

* Prevent race conditions.
* Maintain consistency across multiple execution paths.
* Guarantee integrity regardless of application bugs.

The composite unique constraint acts as the final authority.

---

# Why Not Fuzzy Matching?

The project considered fuzzy similarity techniques.

Examples include:

* Levenshtein distance
* Cosine similarity
* Embeddings
* Semantic vector search

These approaches improve duplicate detection but introduce:

* Additional complexity
* Higher computational cost
* Non-deterministic behavior
* Difficult debugging

For the current scale of JobScraper, deterministic normalization provides a better balance between accuracy and simplicity.

---

# Engineering Principles

This decision follows several architectural principles.

## Model the Business Entity

The database should represent a logical job opportunity rather than a provider-specific webpage.

---

## Deterministic Behavior

Equivalent inputs should always produce identical semantic keys.

This makes duplicate detection predictable and testable.

---

## Push Integrity Into the Database

Application logic performs normalization.

The database guarantees uniqueness.

Both layers cooperate to maintain correctness.

---

## Prefer Explicit Rules

Normalization rules remain transparent.

Developers can easily understand why two jobs were merged.

This would be significantly more difficult with probabilistic matching.

---

# Lessons Learned

Initially, URL-based uniqueness appeared sufficient.

As additional providers were introduced, duplicate listings quickly became one of the largest quality issues in the application.

Treating jobs as business entities rather than URLs produced a much cleaner dataset and significantly improved the user experience.

The introduction of semantic keys also simplified future provider integrations because new providers automatically benefited from the existing deduplication strategy.

---

# Future Considerations

This decision should be revisited if:

* AI-assisted duplicate detection is introduced.
* Vector similarity search becomes part of the ingestion pipeline.
* Providers begin exposing globally shared identifiers.
* Additional business attributes become necessary to distinguish similar roles.

Until then, deterministic semantic keys remain the preferred approach.

---

# Related Documents

* Architecture → Semantic Deduplication
* Architecture → Database Design
* Architecture → Job Processing Pipeline
* Reference → Database Schema
* Guide → Adding a New Provider
