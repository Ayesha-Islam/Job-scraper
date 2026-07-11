---
Incident: 0001
Title: Description Extraction & Normalization
Category: Data Quality
Severity: High
Status: Resolved

First Observed: During integration of multiple job providers

Affected Components:
- Scraper Engine
- Description Enrichment
- Job Processing Pipeline

Related Documentation:
- ../architecture/description-enrichment.md
- ../architecture/job-processing-pipeline.md
- ../architecture/scraper-engine.md

Related ADRs:
- ../engineering-decisions/0003-description-enrichment.md
---

# Engineering Incident 0001: Description Extraction & Normalization

## Executive Summary

Job descriptions extracted from different providers were inconsistent due to provider-specific parsing logic. This resulted in HTML artifacts, duplicated text, inconsistent formatting, and missing descriptions.

The extraction workflow was redesigned to separate provider-specific extraction from shared normalization, ensuring consistent data before persistence.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Inconsistent descriptions found during manual validation. |
| Investigation | Compared scraper output and persisted data across providers. |
| Root Cause | Normalization logic existed inside individual scrapers. |
| Resolution | Introduced a shared normalization pipeline. |
| Verification | Validated normalized output across supported providers. |

---

## Background

Each provider exposes job descriptions using different HTML structures. Initially, every scraper implemented its own extraction and cleanup logic. As more providers were added, maintaining consistent output became difficult.

---

## Problem Statement

Independent normalization caused inconsistent persisted descriptions.

Observed issues included:

- HTML tags in descriptions
- Duplicate content
- Missing descriptions
- Inconsistent formatting
- Provider-specific output

---

## Failure Scenario

```text
Provider HTML
      │
      ▼
Scraper extracts description
      │
      ▼
Provider-specific cleanup
      │
      ▼
Inconsistent output
      │
      ▼
Persisted to database
```

---

## System Impact

| Area | Impact |
|------|--------|
| Data Quality | Inconsistent descriptions |
| User Experience | Reduced readability |
| Processing Pipeline | Inconsistent input for downstream processing |
| Maintainability | Duplicate normalization logic |

---

## Root Cause Analysis

Extraction and normalization were handled together inside each scraper. This duplicated logic and produced inconsistent behavior across providers.

---

## Investigation

The issue was identified through:

- Cross-provider comparison
- Database inspection
- Manual validation of scraper output

The inconsistencies originated during extraction, not persistence.

---

## Solution Architecture

The pipeline was divided into two stages.

### Stage 1 — Extraction

Each scraper extracts raw description content.

### Stage 2 — Normalization

A shared pipeline:

- Removes HTML
- Normalizes whitespace
- Removes duplicate text
- Validates descriptions
- Produces consistent output before persistence

---

## Implementation Notes

### Changes

- Centralized normalization
- Removed duplicated cleanup logic
- Standardized preprocessing

### Benefits

- Consistent descriptions
- Simpler scrapers
- Easier provider integration

---

## Validation

Validation included:

- Cross-provider comparison
- Database inspection
- Frontend verification
- Manual scraper testing

All supported providers produced consistent descriptions after normalization.

---

## Risks

A defect in the shared normalization pipeline can affect all providers. Regression testing is required when normalization behavior changes.

---

## Trade-offs

### Advantages

- Better data quality
- Shared processing logic
- Easier maintenance

### Costs

- Additional preprocessing step
- Shared dependency for normalization

---

## Engineering Principles Reinforced

- Separation of Concerns
- Single Responsibility Principle
- Shared Processing Pipeline
- Consistent Data Processing

---

## Lessons Learned

Scrapers should extract data only. Shared processing such as normalization and validation should be implemented once and reused across all providers.

---

## Future Considerations

- HTML snapshot regression tests
- Provider health monitoring
- Description quality metrics
- Automatic detection of provider layout changes

---

## Evidence

### Verification

- Manual testing
- Database inspection
- Cross-provider comparison

### Related Components

- Description Enrichment
- Scraper Engine
- Job Processing Pipeline

---

## Engineering Assessment

### Immediate Outcome

Descriptions became consistent across providers.

### Architectural Outcome

Normalization moved from individual scrapers into a shared pipeline.

### Long-term Benefit

Future providers can reuse the same normalization workflow, reducing maintenance effort and improving data consistency.