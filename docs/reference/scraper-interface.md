# Scraper Interface Reference

## Overview

Every job source integrated into JobScraper implements the same logical provider contract.

Although providers may differ internally (API, RSS feed, or browser automation), they all produce the same normalized output for the processing pipeline.

This common contract allows providers to participate in the scraping lifecycle without requiring provider-specific logic elsewhere in the application.

---

# Purpose

The scraper interface exists to standardize how external job sources communicate with the remainder of the system.

It ensures every provider:

* Produces normalized job objects
* Participates in monitoring
* Uses the shared processing pipeline
* Reports execution metrics
* Can be orchestrated by the scheduler

The interface intentionally hides provider-specific implementation details.

---

# Provider Lifecycle

Every provider follows the same high-level lifecycle.

```text id="s9nplm"
Initialize

↓

Fetch Listings

↓

Normalize Data

↓

Return Jobs

↓

Processing Pipeline

↓

Execution Summary
```

The scheduler and processing pipeline assume every provider behaves according to this sequence.

---

# Responsibilities

Every provider is responsible for:

* Connecting to the external source
* Discovering available jobs
* Navigating pagination when required
* Extracting job metadata
* Normalizing provider-specific values
* Returning a collection of jobs

Providers should remain focused exclusively on data acquisition.

---

# Non-Responsibilities

Providers should **not** perform:

* Database writes
* Semantic deduplication
* Cache invalidation
* Authentication
* Search indexing
* Business validation
* API response generation

These concerns belong to the shared application infrastructure.

---

# Expected Input

A provider receives configuration supplied by the scraping coordinator.

Typical configuration includes:

* Search keywords
* Maximum page count
* Runtime configuration
* Timeout settings
* Shared browser instance (when applicable)

Providers should avoid relying on global application state.

---

# Expected Output

Every provider returns a collection of normalized job objects.

Conceptually:

```text id="q4wn0z"
Provider

↓

Job[]

↓

Job Processor
```

The returned collection should contain only jobs successfully extracted from the provider.

Invalid listings should be discarded before returning.

---

# Normalized Job Structure

Each returned job should provide enough information for the processing pipeline.

Typical fields include:

| Field           | Required    | Description                 |
| --------------- | ----------- | --------------------------- |
| Company         | Yes         | Employer name               |
| Position        | Yes         | Job title                   |
| URL             | Yes         | Original listing URL        |
| Source          | Yes         | Provider identifier         |
| Location        | Recommended | Job location                |
| Employment Type | Recommended | Full-time, contract, etc.   |
| Posted Date     | Recommended | Original publication date   |
| Description     | Recommended | Raw or enriched description |

The processing pipeline expects consistent field semantics regardless of provider.

---

# Normalization Rules

Provider-specific formatting should be normalized before returning jobs.

Examples include:

## Company

Prefer:

```text id="5tpgnr"
Microsoft
```

Avoid:

```text id="z5m1b0"
Microsoft Corporation

MICROSOFT

microsoft
```

---

## Location

Normalize locations into consistent formats.

Example:

```text id="xwqg53"
Remote (US)

Remote

United States
```

rather than mixing multiple provider-specific variations.

---

## Employment Type

Use the project's supported employment types.

Avoid inventing provider-specific values.

---

# Detail Pages

Many providers expose incomplete listing information.

If descriptions are truncated on listing pages, providers should navigate to the detail page before returning the job.

Returning high-quality data is preferred over maximizing listing count.

---

# Pagination

Providers should continue requesting pages until one of the following occurs:

* Configured page limit reached
* No additional jobs available
* Provider indicates end of results
* Unrecoverable error occurs

Pagination implementation remains provider-specific.

---

# Error Handling

Providers should fail gracefully.

Recoverable failures include:

* Missing elements
* Timeout
* Empty pages
* Network interruption
* Temporary provider errors

Failures should be reported to the scraping coordinator without terminating the overall scraping run.

---

# Logging

Providers should emit useful operational information.

Typical events include:

* Provider started
* Page fetched
* Jobs discovered
* Extraction failures
* Completion summary

Logs should help diagnose provider-specific issues without exposing unnecessary implementation details.

---

# Monitoring Integration

Every provider automatically participates in the monitoring system.

Typical metrics include:

* Execution duration
* Jobs discovered
* Jobs accepted
* Jobs rejected
* Warning count
* Enrichment success
* Provider health

Providers should expose sufficient information for accurate reporting.

---

# Quality Expectations

A provider should strive to return:

* Accurate company names
* Complete job titles
* Correct locations
* Usable descriptions
* Stable URLs

Poor-quality data should be rejected rather than persisted.

---

# Interaction with the Processing Pipeline

The provider hands control to the shared processing pipeline immediately after extraction.

```text id="6twgca"
Provider

↓

Normalization

↓

Job Processor

↓

Validation

↓

Semantic Deduplication

↓

Description Enrichment

↓

Persistence
```

The provider does not control any stage beyond normalization.

---

# Interaction with the Scheduler

Providers do not schedule themselves.

Execution is controlled by the scheduler.

Responsibilities remain separate.

```text id="bhivn5"
Scheduler

↓

Provider

↓

Job Processor
```

This separation keeps providers independent of execution policy.

---

# Performance Guidelines

Providers should:

* Minimize unnecessary requests
* Avoid duplicate navigation
* Respect provider rate limits
* Reuse browser resources when possible
* Stop pagination when appropriate

Efficiency should not come at the expense of extraction quality.

---

# Reliability Guidelines

Providers should be resilient to minor provider changes.

Preferred strategies include:

* Stable selectors
* Defensive extraction
* Null-safe parsing
* Graceful degradation
* Provider-specific validation

Avoid fragile extraction strategies that depend on presentation details.

---

# Best Practices

When implementing a provider:

* Keep extraction logic self-contained.
* Normalize values before returning.
* Prefer explicit selectors over broad wrappers.
* Handle failures gracefully.
* Keep business rules outside the provider.
* Reuse shared processing components.

Following these principles ensures that all providers remain interchangeable within the scraping architecture.

---

# Related Documentation

For implementation guidance, see:

* Adding a New Provider Guide
* Scraper Engine
* Job Processing Pipeline
* Description Enrichment
* Monitoring & Observability
* Database Design
