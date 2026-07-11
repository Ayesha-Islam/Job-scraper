---
Incident: 0005
Title: Scraper Resilience
Category: Reliability
Severity: High
Status: Resolved

First Observed: During integration of multiple job providers

Affected Components:
- Scraper Engine
- Job Processing Pipeline
- Provider Adapters

Related Documentation:
- ../architecture/scraper-engine.md
- ../architecture/job-processing-pipeline.md
- ../architecture/monitoring.md

Related ADRs:
- ../engineering-decisions/0004-provider-architecture.md
---

# Engineering Incident 0005: Scraper Resilience

## Executive Summary

Scrapers depended on external websites with varying HTML structures and data quality. Missing fields, malformed content, and provider changes could interrupt scraping or produce incomplete records.

The scraping workflow was redesigned to validate extracted data, isolate provider failures, and continue processing whenever possible.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Scraper failures occurred due to invalid provider data. |
| Investigation | Failed jobs and scraper logs were analyzed. |
| Root Cause | Scrapers assumed extracted data was always valid. |
| Resolution | Added validation, defensive parsing, and failure isolation. |
| Verification | Scrapers completed successfully despite invalid source data. |

---

## Background

The platform aggregates jobs from multiple providers, each with independent HTML structures and update schedules. Providers may introduce layout changes or publish incomplete data without notice.

A reliable scraper must tolerate these variations without affecting the overall scraping process.

---

## Problem Statement

Scrapers trusted provider data without sufficient validation.

Observed issues included:

- Missing required fields
- Invalid HTML
- Incomplete job records
- Provider-specific parsing failures
- Interrupted scraper execution

---

## Failure Scenario

```text
Fetch Provider
      │
      ▼
Extract Job
      │
      ▼
Invalid Data
      │
      ▼
Unhandled Error
      │
      ▼
Scraper Stops
```

---

## System Impact

| Area | Impact |
|------|--------|
| Scraper Execution | Individual failures interrupted processing. |
| Data Quality | Incomplete jobs could be persisted. |
| Operations | Provider issues required manual investigation. |
| Reliability | Reduced confidence in scheduled scraping. |

---

## Root Cause Analysis

Scrapers assumed provider responses were complete and correctly formatted. Unexpected HTML changes or missing fields caused parsing failures that propagated through the scraping workflow.

The absence of validation and error isolation reduced overall reliability.

---

## Investigation

The issue was identified through:

- Scraper execution logs
- Failed provider runs
- Database inspection
- Manual verification of provider pages

The failures were caused by unexpected provider data rather than application defects.

---

## Solution Architecture

The scraping workflow was updated to validate data before persistence.

The revised pipeline:

1. Extract raw provider data.
2. Validate required fields.
3. Skip invalid records.
4. Log validation failures.
5. Continue processing remaining jobs.

This prevents isolated failures from interrupting the entire scraping session.

---

## Implementation Notes

### Changes

- Added input validation.
- Improved defensive parsing.
- Isolated record-level failures.
- Standardized scraper error handling.

### Benefits

- Improved scraper stability.
- Cleaner persisted data.
- Reduced manual intervention.

---

## Validation

Validation included:

- Scraping providers with incomplete data.
- Simulated missing fields.
- Verification of skipped invalid records.
- Successful completion of scraper execution.

The scraper completed successfully while reporting validation failures.

---

## Risks

Skipping invalid records may temporarily reduce the number of imported jobs until provider issues are resolved.

Validation rules should balance data quality with acceptable data loss.

---

## Trade-offs

### Advantages

- Improved reliability
- Better data quality
- Isolated failures
- Predictable execution

### Costs

- Additional validation logic.
- Invalid records require monitoring instead of persistence.

---

## Engineering Principles Reinforced

- Defensive Programming
- Fault Isolation
- Data Validation
- Graceful Degradation

---

## Lessons Learned

External systems should never be assumed to produce valid or stable data.

Validation should occur immediately after extraction, allowing invalid records to be rejected before entering the processing pipeline.

---

## Future Considerations

- Provider-specific validation rules.
- Automatic detection of HTML structure changes.
- Validation metrics by provider.
- Alerting for repeated extraction failures.

---

## Evidence

### Verification

- Scraper execution logs
- Validation error logs
- Database inspection
- Cross-provider testing

### Related Components

- Scraper Engine
- Provider Adapters
- Job Processing Pipeline

---

## Engineering Assessment

### Immediate Outcome

Scrapers continue processing despite invalid or incomplete provider data.

### Architectural Outcome

Validation became a dedicated stage in the scraping pipeline instead of being handled inconsistently within individual scrapers.

### Long-term Benefit

The scraping system is more resilient to provider changes, simplifying maintenance and reducing operational interruptions.