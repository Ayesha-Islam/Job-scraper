# Debugging Scrapers

## Before You Begin

| Item               | Value                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| **Estimated Time** | 15–60 minutes                                                                                     |
| **Difficulty**     | Intermediate                                                                                      |
| **Prerequisites**  | Local development environment, ability to run the scraper, familiarity with provider architecture |
| **Outcome**        | Identify and resolve scraping failures using the project's built-in monitoring and diagnostics.   |

---

# Overview

Web scraping is inherently dependent on external systems.

Provider websites change frequently, HTML structures evolve, APIs are modified, and network conditions vary.

For these reasons, scraper failures should be treated as expected operational events rather than exceptional situations.

JobScraper includes multiple layers of diagnostics to help identify failures quickly.

This guide explains how to use those diagnostics effectively.

---

# Debugging Decision Tree

```text
Is the scraper failing?

│
├── No jobs discovered
│      ↓
│   Check provider navigation
│
├── Jobs discovered but rejected
│      ↓
│   Review validation and skip reasons
│
├── Jobs saved but descriptions are poor
│      ↓
│   Inspect enrichment pipeline
│
├── Duplicate jobs appear
│      ↓
│   Verify semantic keys
│
├── Provider health is DEGRADED
│      ↓
│   Review warnings and metrics
│
└── Scraper is slow
       ↓
    Review execution time and pagination
```

Start with the symptom rather than inspecting code immediately.

---

# Step 1 — Run the Scraper

Execute a scraping cycle.

```bash
cd api

npm run scrape
```

Allow the run to complete before investigating.

Many provider issues become apparent in the execution summary.

---

# Step 2 — Read the Provider Summary

Each provider produces a summary similar to:

```text
Provider

Health

Jobs Found

Jobs Accepted

Jobs Rejected

Execution Time

Warnings
```

Do not begin debugging HTML until you understand these metrics.

Often the summary already identifies the problem.

---

# No Jobs Found

Symptoms:

* Zero discovered jobs
* Provider health degraded
* Empty processing pipeline

Possible causes:

* HTML structure changed
* API unavailable
* Pagination failure
* Network timeout
* Incorrect selectors

Recommended investigation:

1. Open the provider manually.
2. Inspect the current HTML.
3. Compare against extraction selectors.
4. Verify pagination still exists.
5. Confirm requests complete successfully.

---

# Jobs Rejected

Symptoms:

* Jobs discovered
* Very few accepted
* Large rejection count

Review skip reasons.

Typical examples include:

* Missing company
* Missing title
* Invalid location
* Empty description
* Business rule rejection

The processing pipeline intentionally records why every job was rejected.

Begin there before modifying extraction logic.

---

# Poor Descriptions

Symptoms:

* Extremely short descriptions
* Navigation text
* Authentication pages
* Empty descriptions

Possible causes:

* Listing page used instead of detail page
* Provider HTML changed
* Extraction selector outdated
* Failed quality validation

Inspect:

* Detail page
* Enrichment logic
* Cleaned HTML
* Quality validation output

---

# Duplicate Jobs

Symptoms:

* Same job appears multiple times
* Duplicate database records

Investigate:

* Normalization
* `companyKey`
* `positionKey`
* `locationKey`

Verify that equivalent provider values normalize to identical business keys.

Do not begin by inspecting SQL.

---

# Provider Health = DEGRADED

A degraded provider does not necessarily mean scraping failed.

Health may decrease because of:

* High enrichment failure rate
* Poor extraction quality
* Repeated warnings
* Increased rejection rate

Read warnings before modifying the provider.

---

# Timeout Errors

Symptoms:

* Navigation timeout
* Browser timeout
* Request timeout

Possible causes:

* Slow provider
* Network latency
* Heavy JavaScript rendering

Investigate:

* Browser navigation
* Waiting strategy
* Timeout configuration
* Provider availability

Avoid increasing timeouts before identifying the root cause.

---

# Selector Failures

Symptoms:

* Missing title
* Missing company
* Empty description

Procedure:

1. Open browser developer tools.
2. Inspect current HTML.
3. Compare against implemented selectors.
4. Update extraction logic.
5. Run the scraper again.

Selectors should be as stable and specific as possible.

---

# Pagination Problems

Symptoms:

* Only first page scraped
* Missing jobs
* Repeated first page

Verify:

* Pagination URL
* Next-page selector
* Page counter
* Loop termination

Pagination issues frequently appear after provider redesigns.

---

# Authentication Walls

Symptoms:

* Login page extracted
* Authentication prompt
* Generic provider landing page

Do not persist these pages.

Review provider-specific validation and quality checks.

Authentication pages should be rejected before persistence.

---

# Wrapper Extraction

Symptoms:

Descriptions contain:

* Navigation
* Footer
* Related jobs
* Entire HTML sections

This usually indicates that extraction targeted a page wrapper instead of the description container.

Review provider-specific extraction rather than HTML cleanup.

---

# Review Processing Metrics

Processing metrics provide valuable debugging information.

Inspect:

* Accepted jobs
* Rejected jobs
* Duplicate count
* Enrichment success
* Warning count
* Execution time

Unexpected values usually identify the failing stage.

---

# Review Logs

Logs should be read in execution order.

Typical progression:

```text
Provider Started

↓

Jobs Found

↓

Validation

↓

Enrichment

↓

Persistence

↓

Summary
```

Avoid searching randomly through log output.

Follow the execution lifecycle.

---

# Verify Database Output

After debugging:

* Run the scraper.
* Open Prisma Studio (or your preferred database client).
* Inspect stored jobs.

Verify:

* Company
* Position
* Location
* Description
* Source
* Posted date

Never assume successful persistence means correct persistence.

---

# Verify the Frontend

Finally:

1. Open the application.
2. Search for imported jobs.
3. Verify:

   * Rendering
   * Descriptions
   * Filtering
   * Sorting

This confirms the issue has been resolved end-to-end.

---

# Common Mistakes

Avoid the following debugging patterns.

## Editing Multiple Things at Once

Change one variable.

Run the scraper.

Observe the result.

Repeat.

---

## Ignoring Skip Reasons

Skip reasons often explain failures immediately.

Always review them before modifying extraction logic.

---

## Increasing Timeouts Blindly

Timeouts are symptoms.

Not solutions.

Determine why the provider is slow before increasing limits.

---

## Ignoring Monitoring Metrics

Provider summaries exist to reduce debugging time.

Use them.

---

## Assuming the Database Is Wrong

Most failures occur before persistence.

Investigate extraction and processing first.

---

# Debugging Workflow

A recommended workflow is:

```text
Run Scraper

↓

Read Provider Summary

↓

Identify Symptom

↓

Inspect Logs

↓

Review Metrics

↓

Fix Provider

↓

Run Again

↓

Verify Database

↓

Verify Frontend
```

This minimizes unnecessary investigation.

---

# Best Practices

* Keep changes small.
* Test after every modification.
* Verify end-to-end behavior.
* Review monitoring metrics.
* Treat provider websites as unstable dependencies.
* Prefer provider-specific fixes over global workarounds.

---

# Related Documentation

See also:

* Scraper Engine
* Job Processing Pipeline
* Description Enrichment
* Monitoring & Observability
* Adding a New Provider
* Testing Guide
* Scraper Interface Reference
