# ADR-0003: Description Enrichment Pipeline

**Status:** Accepted

**Date:** June 2026

**Decision Makers:** JobScraper Architecture

---

# Context

JobScraper aggregates jobs from multiple external providers.

Each provider exposes job descriptions differently.

Examples include:

* Complete descriptions on the listing page
* Truncated previews
* Detail pages
* HTML fragments
* Markdown
* Plain text
* Authentication pages
* Navigation wrappers

The quality and structure of provider descriptions vary significantly.

Persisting these descriptions without verification would reduce the quality of search results and the overall user experience.

---

# Problem

Job descriptions collected from providers are frequently incomplete or incorrect.

Typical issues include:

* Truncated descriptions
* Login pages
* Cookie banners
* Navigation menus
* Related job sections
* Entire page wrappers
* Empty descriptions
* HTML artifacts

For example, a provider may return:

```text id="0vut5x"
Sign in to continue

Join now

People also viewed

Related jobs
```

instead of the actual job description.

If stored directly, these descriptions pollute the dataset and reduce search quality.

---

# Decision

JobScraper introduces a shared **Description Enrichment Pipeline** between extraction and persistence.

Every provider follows the same workflow.

```text id="q9ol4n"
Provider

↓

Extract Description

↓

Enrichment

↓

Quality Validation

↓

Persist
```

Descriptions are treated as **untrusted input** until they satisfy predefined quality requirements.

---

# Rationale

Provider HTML is optimized for human browsing rather than structured data extraction.

As providers evolve, extraction quality naturally varies.

Instead of expecting every provider implementation to solve these problems independently, JobScraper centralizes description processing into a shared pipeline.

This approach provides:

* Consistent description quality
* Reduced provider duplication
* Easier maintenance
* Shared validation rules
* Better search experience

---

# Alternatives Considered

## Alternative 1 — Store Raw Provider Output

Advantages

* Very simple implementation
* Fast persistence
* No additional processing

Disadvantages

* Poor search quality
* Authentication pages stored
* Wrapper extraction persisted
* Inconsistent descriptions
* Difficult provider maintenance

Decision:

**Rejected**

---

## Alternative 2 — Provider-Specific Cleanup

Each provider performs its own enrichment.

Advantages

* Highly customized extraction
* Provider-specific optimization

Disadvantages

* Significant code duplication
* Inconsistent quality
* Difficult maintenance
* Validation logic scattered throughout providers

Decision:

**Rejected**

---

## Alternative 3 — Shared Enrichment Pipeline

Advantages

* Centralized quality rules
* Consistent descriptions
* Easier maintenance
* Reusable validation
* Reduced provider complexity

Disadvantages

* Additional processing step
* More implementation complexity

Decision:

**Accepted**

---

# Enrichment Workflow

The enrichment pipeline follows a deterministic sequence.

```text id="lrb2hp"
Extract

↓

Clean

↓

Validate

↓

Accept

or

Reject
```

Only validated descriptions are eligible for persistence.

---

# Quality Validation

The pipeline evaluates several characteristics before accepting a description.

Examples include:

* Minimum content quality
* Meaningful text
* Provider-specific rejection rules
* Authentication detection
* Wrapper detection
* Empty description detection

Descriptions that fail validation are rejected rather than stored.

---

# Why Validation Is Centralized

Validation rules are intentionally shared across providers.

Benefits include:

* Consistent behavior
* Reduced duplication
* Easier debugging
* Faster provider development

Provider implementations remain focused on extraction rather than business validation.

---

# Provider Responsibilities

Providers are responsible for:

* Navigating pages
* Extracting candidate descriptions
* Returning extracted content

Providers are **not** responsible for determining whether a description is acceptable.

Quality decisions belong to the enrichment pipeline.

---

# Consequences

Positive

* Higher-quality search results.
* Reduced provider-specific cleanup.
* Consistent description formatting.
* Easier onboarding for new providers.
* Centralized quality improvements.

Negative

* Additional processing time.
* More validation logic.
* Some descriptions may be rejected despite containing partial information.

The improvement in overall data quality outweighs these costs.

---

# Examples

## Accepted

```text id="jlwm5v"
Responsibilities

Required Qualifications

Preferred Skills

Benefits

About the Role
```

The description contains meaningful job-related content.

---

## Rejected

```text id="jlwm94"
Sign in

Join now

Cookie Preferences

Privacy Policy
```

The extracted content does not describe a job.

---

## Rejected

```text id="jlwm7x"
Home

Jobs

Companies

Resources

Blog
```

Navigation content should never be persisted as a job description.

---

# Provider-Specific Rules

Some providers require additional validation.

Examples include:

* Authentication wall detection
* Wrapper detection
* Truncated content detection
* Detail-page verification

These rules complement the shared validation pipeline rather than replacing it.

---

# Engineering Principles

## Treat External Data as Untrusted

Provider output should never be assumed correct.

Validation protects the integrity of the dataset.

---

## Centralize Shared Logic

Description quality rules belong in one location.

This ensures all providers benefit from future improvements automatically.

---

## Prefer Rejection Over Low-Quality Data

An incomplete dataset is preferable to a misleading dataset.

Rejecting poor descriptions preserves overall search quality.

---

## Keep Providers Simple

Providers should acquire data.

The enrichment pipeline should evaluate data quality.

Separating these responsibilities simplifies both components.

---

# Lessons Learned

Early versions of JobScraper stored provider descriptions directly.

As additional providers were introduced, inconsistent descriptions became one of the largest quality problems.

Common failures included:

* Authentication pages
* Full-page wrappers
* Truncated descriptions
* Empty content

Introducing a centralized enrichment pipeline significantly improved the consistency and usefulness of stored job descriptions.

It also reduced the amount of provider-specific cleanup code required for future integrations.

---

# Future Considerations

This decision should be revisited if:

* AI-assisted enrichment becomes part of the ingestion pipeline.
* Automatic summarization is introduced.
* Semantic quality scoring replaces deterministic validation.
* Provider APIs begin exposing structured descriptions directly.

The current architecture intentionally separates extraction from enrichment so these enhancements can be introduced without modifying provider implementations.

---

# Related Documents

* Architecture → Description Enrichment
* Architecture → Job Processing Pipeline
* Architecture → Monitoring
* Guide → Adding a New Provider
* Guide → Debugging Scrapers
* Reference → Scraper Interface
