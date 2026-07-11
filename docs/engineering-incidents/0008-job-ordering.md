---
Incident: 0008
Title: Job Ordering
Category: Business Logic
Severity: Medium
Status: Resolved

First Observed: During frontend testing and repeated scraper execution

Affected Components:
- Job Processing Pipeline
- Search System
- Frontend API

Related Documentation:
- ../architecture/search-system.md
- ../architecture/job-processing-pipeline.md
- ../architecture/backend.md

Related ADRs:
- ../engineering-decisions/0001-prisma-vs-pg.md
---

# Engineering Incident 0008: Job Ordering

## Executive Summary

Job listings were returned in an inconsistent order because result ordering depended on database insertion sequence and provider execution timing. This caused unstable search results and pagination.

The query layer was updated to apply deterministic sorting, ensuring consistent job ordering across requests.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Job order changed between repeated requests. |
| Investigation | Reviewed query execution and sorting behavior. |
| Root Cause | Queries relied on implicit database ordering. |
| Resolution | Introduced explicit ordering in database queries. |
| Verification | Repeated requests returned consistent results. |

---

## Background

Jobs are continuously imported from multiple providers. New jobs are inserted throughout each scraping session, making insertion order unpredictable.

Without explicit sorting, the database determines the result order, which is not guaranteed to remain consistent.

---

## Problem Statement

Job retrieval depended on implicit database ordering.

Observed issues included:

- Inconsistent job order
- Unstable pagination
- Different ordering after scraper execution
- Reduced user experience

---

## Failure Scenario

```text
User Requests Jobs
        │
        ▼
Database Query
        │
        ▼
No ORDER BY
        │
        ▼
Database Returns
Arbitrary Order
        │
        ▼
Inconsistent Results
```

---

## System Impact

| Area | Impact |
|------|--------|
| Frontend | Job list changed between requests |
| Search | Inconsistent search results |
| Pagination | Records shifted between pages |
| User Experience | Reduced predictability |

---

## Root Cause Analysis

Queries relied on the database's default row order instead of an explicit sorting strategy.

As new jobs were inserted, the returned order changed, causing inconsistent API responses.

---

## Investigation

The issue was identified through:

- Repeated API requests
- Frontend testing
- Pagination verification
- Query review

The inconsistent ordering originated from the query layer rather than the scraper or database.

---

## Solution Architecture

Job retrieval was updated to use explicit ordering.

The revised workflow:

1. Execute search query.
2. Apply deterministic sort criteria.
3. Return ordered results.
4. Preserve ordering across repeated requests.

Ordering is now independent of insertion sequence.

---

## Implementation Notes

### Changes

- Added explicit query ordering.
- Standardized sorting behavior.
- Unified ordering across endpoints.

### Benefits

- Stable search results.
- Consistent pagination.
- Predictable API responses.

---

## Validation

Validation included:

- Repeated API requests.
- Pagination testing.
- Search result comparison.
- Verification after scraper execution.

Results remained consistent across repeated requests.

---

## Risks

Ordering by a single field may produce identical values for multiple records.

A secondary sort key should be used when deterministic ordering is required.

---

## Trade-offs

### Advantages

- Predictable API responses.
- Stable pagination.
- Consistent user experience.

### Costs

- Additional database sorting.
- More explicit query logic.

---

## Engineering Principles Reinforced

- Deterministic Processing
- Consistent API Behavior
- Predictable Data Retrieval
- Stable Pagination

---

## Lessons Learned

Database queries should always define explicit ordering when result consistency affects application behavior.

Implicit ordering should never be relied upon for user-facing features.

---

## Future Considerations

- Configurable sort options.
- Multi-field ordering.
- User-defined sorting.
- Query performance monitoring.

---

## Evidence

### Verification

- API testing.
- Pagination validation.
- Query review.
- Frontend verification.

### Related Components

- Search System
- Backend API
- Job Processing Pipeline

---

## Engineering Assessment

### Immediate Outcome

Job listings are returned in a consistent and predictable order.

### Architectural Outcome

Sorting became an explicit responsibility of the query layer rather than relying on database behavior.

### Long-term Benefit

Deterministic ordering provides stable search results, reliable pagination, and a consistent user experience as the dataset grows.