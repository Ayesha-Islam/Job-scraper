---
Incident: 0010
Title: Backend Data Integrity & Validation
Category: Data Integrity
Severity: High
Status: Resolved

First Observed: During backend integration and API testing

Affected Components:
- API Layer
- Service Layer
- Database Layer
- Job Processing Pipeline

Related Documentation:
- ../architecture/backend.md
- ../architecture/api.md
- ../architecture/database-design.md
- ../architecture/job-processing-pipeline.md

Related ADRs:
- ../engineering-decisions/0001-prisma-vs-pg.md
- ../engineering-decisions/0002-semantic-deduplication.md
---

# Engineering Incident 0010: Backend Data Integrity & Validation

## Executive Summary

Backend components accepted data from multiple sources, including web scrapers, client requests, and internal services. Without consistent validation, invalid or incomplete data could propagate through the application before being rejected.

Validation responsibilities were standardized across the backend, ensuring data is verified before business logic execution and database persistence.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Inconsistent validation observed across backend components. |
| Investigation | Reviewed request lifecycle and service interactions. |
| Root Cause | Validation responsibilities were distributed across multiple layers. |
| Resolution | Standardized validation before business logic and persistence. |
| Verification | Invalid data was consistently rejected before persistence. |

---

## Background

The backend receives data from multiple entry points:

- Scrapers
- REST API requests
- Internal services

Each source can introduce incomplete, malformed, or inconsistent data. Validation should occur before business logic executes to maintain a consistent application state.

---

## Problem Statement

Validation was performed inconsistently across the backend.

Observed issues included:

- Missing required fields
- Invalid request payloads
- Inconsistent enum values
- Duplicate validation logic
- Late detection of invalid data

---

## Failure Scenario

```text
Incoming Request
        │
        ▼
Business Logic
        │
        ▼
Invalid Data
        │
        ▼
Database Operation
        │
        ▼
Persistence Failure
```

---

## System Impact

| Area | Impact |
|------|--------|
| API | Inconsistent error handling |
| Services | Duplicate validation logic |
| Database | Invalid persistence attempts |
| Maintenance | Harder to maintain validation rules |

---

## Root Cause Analysis

Validation responsibilities were not clearly defined.

Some validation occurred in controllers, some in services, while other checks relied on database constraints. This made behavior inconsistent and increased maintenance effort.

---

## Investigation

The issue was identified through:

- API testing
- Service-layer review
- Database error analysis
- Validation flow inspection

The investigation showed that validation occurred too late in the request lifecycle.

---

## Solution Architecture

Validation was standardized before business logic execution.

The revised workflow:

1. Receive request or scraped data.
2. Validate required fields.
3. Validate data format and business rules.
4. Execute business logic.
5. Persist validated data.

This ensures invalid data is rejected before reaching the database.

---

## Implementation Notes

### Changes

- Standardized validation flow.
- Reduced duplicate validation logic.
- Improved error consistency.
- Centralized validation responsibilities.

### Benefits

- Consistent request handling.
- Improved data integrity.
- Simpler maintenance.
- More predictable API behavior.

---

## Validation

Validation included:

- API request testing.
- Invalid input testing.
- Service-layer verification.
- Database consistency checks.

Invalid data was rejected before business logic and persistence.

---

## Risks

Validation rules must remain synchronized with evolving business requirements.

Overly restrictive validation may reject valid future inputs.

---

## Trade-offs

### Advantages

- Improved data integrity.
- Consistent validation.
- Predictable error handling.
- Reduced duplicate logic.

### Costs

- Additional validation layer.
- Ongoing maintenance of validation rules.

---

## Engineering Principles Reinforced

- Fail Fast
- Separation of Concerns
- Data Integrity
- Consistent Validation
- Defensive Programming

---

## Lessons Learned

Validation should occur as early as possible in the request lifecycle.

Business logic should operate only on validated data, while database constraints provide a final safeguard rather than the primary validation mechanism.

---

## Future Considerations

- Schema-based request validation.
- Shared validation utilities.
- Validation metrics.
- Standardized API error responses.
- Automated contract testing.

---

## Evidence

### Verification

- API testing.
- Service integration testing.
- Database validation.
- Backend code review.

### Related Components

- API Layer
- Service Layer
- Database Layer
- Job Processing Pipeline

---

## Engineering Assessment

### Immediate Outcome

Invalid data is consistently rejected before business logic and persistence.

### Architectural Outcome

Validation became a dedicated backend responsibility with a consistent execution flow across all components.

### Long-term Benefit

A standardized validation strategy improves maintainability, reduces defects, and ensures consistent behavior as new APIs, scrapers, and services are added.