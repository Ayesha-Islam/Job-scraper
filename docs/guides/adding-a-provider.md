# Adding a New Job Provider

## Before You Begin

| Item               | Value                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Estimated Time** | 30–90 minutes                                                                                                   |
| **Difficulty**     | Intermediate                                                                                                    |
| **Prerequisites**  | TypeScript, Playwright (or provider API), familiarity with the Scraper Engine                                   |
| **Outcome**        | A fully integrated provider that participates in scraping, validation, enrichment, monitoring, and persistence. |

---

# Overview

JobScraper was designed so that new job providers can be added without modifying the core scraping pipeline.

Each provider is responsible only for collecting raw job information.

The remainder of the application—including validation, semantic deduplication, enrichment, persistence, caching, and monitoring—is shared automatically.

As a result, adding a provider primarily involves implementing provider-specific extraction logic.

---

# How Providers Fit Into the Architecture

Every provider follows the same execution path.

```mermaid
flowchart LR

Scheduler

-->

Scrape Coordinator

-->

Provider

-->

Job Processor

-->

Database

-->

Search API
```

Notice that the provider **does not** communicate directly with:

* PostgreSQL
* Redis
* Controllers
* Search
* Authentication

This separation keeps providers small and focused.

---

# Provider Responsibilities

A provider is responsible for:

* Discovering jobs
* Navigating pagination
* Extracting metadata
* Returning normalized jobs

A provider is **not** responsible for:

* Deduplication
* Persistence
* Validation
* Description enrichment
* Cache invalidation
* Metrics aggregation

Those concerns are handled automatically by the processing pipeline.

---

# Step 1 — Study the Target Website

Before writing any code, inspect the provider.

Determine:

* Does it expose an API?
* Is an RSS feed available?
* Does it require browser automation?
* Is JavaScript rendering required?
* Are detail pages needed?
* Are there rate limits?

Understanding the provider first prevents unnecessary implementation work.

---

# Step 2 — Create the Provider

Create a new provider inside the scraper directory.

Example:

```text
src/
└── providers/
    └── ExampleProvider.ts
```

Keep provider implementations self-contained.

Avoid referencing unrelated providers.

---

# Step 3 — Implement the Scraper Contract

Every provider should expose the same high-level behavior:

```text
Initialize

↓

Collect Listings

↓

Normalize Jobs

↓

Return Jobs
```

The provider should return normalized job objects rather than writing directly to the database.

---

# Step 4 — Extract Listing Data

Collect the minimum information required by the processing pipeline.

Typical fields include:

* Company
* Position
* Location
* Source
* URL
* Posted date
* Description (if available)

Do not attempt to perform semantic deduplication or business validation here.

---

# Step 5 — Normalize Values

Providers expose metadata differently.

Normalize values before returning them.

Examples include:

* Company names
* Location formats
* Employment types
* Dates

Normalization should produce values consistent with existing providers.

---

# Step 6 — Register the Provider

Register the provider with the scraping coordinator.

This allows the scheduler to execute it alongside existing providers.

After registration, the provider automatically participates in:

* Scheduled scraping
* Manual scraping
* Metrics collection
* Processing summaries

No changes should be required in the processing pipeline.

---

# Step 7 — Run the Provider

Execute a scraping cycle.

```bash
npm run scrape
```

Observe the logs.

Verify:

* Provider starts successfully
* Listings are discovered
* Jobs enter the processing pipeline
* Summary metrics are produced

---

# Step 8 — Verify Processing

The provider should automatically benefit from the shared processing pipeline.

Verify that jobs pass through:

```text
Normalization

↓

Validation

↓

Semantic Deduplication

↓

Description Enrichment

↓

Persistence
```

If additional provider-specific validation is required, implement it without bypassing the shared pipeline.

---

# Step 9 — Review Metrics

Every provider should produce operational summaries.

Review metrics such as:

* Jobs discovered
* Accepted jobs
* Rejected jobs
* Duplicate count
* Enrichment success
* Execution time
* Warning count

Unexpected values often indicate extraction issues.

---

# Step 10 — Verify Search Results

After scraping completes:

1. Open the frontend.
2. Search for newly imported jobs.
3. Verify:

   * Company names
   * Job titles
   * Locations
   * Descriptions
   * Source attribution

This confirms successful end-to-end integration.

---

# Provider Checklist

Before submitting a new provider, verify:

* Listing discovery works.
* Pagination completes correctly.
* Required fields are extracted.
* Normalization is applied.
* Duplicate jobs are prevented.
* Descriptions are usable.
* Metrics appear correctly.
* Search results are correct.
* Tests pass.

---

# Common Mistakes

## Writing Directly to the Database

Incorrect:

```text
Provider

↓

Database
```

Correct:

```text
Provider

↓

Job Processor

↓

Database
```

All persistence should occur through the shared processing pipeline.

---

## Duplicating Validation Logic

Do not copy validation rules into providers.

The processing pipeline already performs:

* Required field validation
* Business rules
* Semantic deduplication
* Quality validation

Keeping validation centralized ensures consistent behavior across all providers.

---

## Returning Provider-Specific Data

Providers should return normalized values.

Avoid leaking provider-specific formats into the remainder of the application.

---

## Skipping Error Handling

External providers are unreliable.

Handle:

* Timeouts
* Missing elements
* Network failures
* Empty responses

A provider should fail gracefully without interrupting the overall scraping cycle.

---

## Ignoring Detail Pages

Many providers expose only partial descriptions.

If listing pages contain truncated data, implement detail-page extraction rather than persisting incomplete descriptions.

---

# Debugging Tips

If a provider produces no jobs:

* Verify selectors.
* Inspect HTML changes.
* Confirm pagination.
* Check network requests.
* Review provider logs.

If jobs are rejected:

* Inspect skip reasons.
* Review validation output.
* Confirm normalization.
* Verify required fields.

If descriptions are poor:

* Review detail-page extraction.
* Check quality validation.
* Inspect cleaned HTML.

---

# Testing

Before merging a provider:

* Run unit tests.
* Execute a full scraping cycle.
* Confirm semantic deduplication.
* Verify enrichment.
* Inspect provider summaries.
* Search for imported jobs through the frontend.

Every new provider should satisfy the same quality standards as existing providers.

---

# Provider Design Principles

When implementing a provider:

* Keep extraction simple.
* Keep business logic out of the provider.
* Return normalized jobs.
* Reuse the shared processing pipeline.
* Prefer explicit extraction over fragile heuristics.
* Treat providers as independent plugins.

Following these principles keeps the architecture maintainable as additional providers are added.

---

# Related Documentation

For additional information, see:

* Scraper Engine
* Job Processing Pipeline
* Description Enrichment
* Semantic Deduplication
* Monitoring & Observability
* Testing Guide
* Scraper Interface Reference
