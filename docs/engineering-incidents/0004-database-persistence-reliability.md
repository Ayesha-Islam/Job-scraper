---
Incident: 0004
Title: Database Persistence Reliability
Category: Database
Severity: High
Status: Resolved

First Observed: During repeated scraper execution

Affected Components:
- Database Layer
- Job Processing Pipeline
- Persistence Service

Related Documentation:
- ../architecture/database-design.md
- ../architecture/job-processing-pipeline.md

Related ADRs:
- ../engineering-decisions/0001-prisma-vs-pg.md
---

# Engineering Incident 0004: Database Persistence Reliability

## Executive Summary

Repeated scraper executions occasionally produced inconsistent database state due to duplicate inserts, partial updates, and interrupted persistence operations.

The persistence workflow was redesigned to perform idempotent writes, ensuring repeated scraper executions produced a consistent database state.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Duplicate and inconsistent records observed after repeated scraper runs. |
| Investigation | Persistence workflow reviewed during repeated executions. |
| Root Cause | Database writes were not fully idempotent. |
| Resolution | Introduced reliable persistence using controlled upsert operations. |
| Verification | Multiple scraper executions produced consistent results. |

---

## Background

The scraper continuously imports jobs from multiple providers. Providers are revisited on every execution, making repeated writes a normal part of the workflow.

Persistence must therefore support repeated execution without creating inconsistent data.

---

## Problem Statement

Repeated scraping could produce inconsistent persistence behavior.

Observed issues included:

- Duplicate inserts
- Partial updates
- Inconsistent timestamps
- Repeated database operations

These issues reduced confidence in the consistency of stored job data.

---

## Failure Scenario

```text
Scraper
    │
    ▼
Persist Job
    │
    ▼
Record Exists
    │
 ┌──┴──┐
 │     │
Insert Update
 │
 ▼
Duplicate Record
```

---

## System Impact

| Area | Impact |
|------|--------|
| Database | Duplicate or inconsistent records |
| Search | Duplicate search results |
| Pipeline | Unnecessary database operations |
| Maintenance | Difficult data cleanup |

---

## Root Cause Analysis

Persistence logic did not consistently distinguish between creating new records and updating existing ones.

Repeated scraper execution could therefore produce duplicate or partially updated records.

---

## Investigation

The issue was identified through:

- Multiple scraper executions
- Database inspection
- Duplicate record analysis
- Persistence workflow review

The inconsistencies originated during database persistence rather than data extraction.

---

## Solution Architecture

Persistence was redesigned around idempotent operations.

The workflow now:

1. Identify existing records.
2. Update existing data when appropriate.
3. Insert only new jobs.
4. Prevent duplicate persistence.

This allows scraper execution to be safely repeated.

---

## Implementation Notes

### Changes

- Improved persistence workflow.
- Standardized create/update logic.
- Reduced duplicate writes.

### Benefits

- Consistent database state.
- Predictable scraper execution.
- Simpler maintenance.

---

## Validation

Validation included:

- Multiple scraper executions.
- Database consistency checks.
- Duplicate record verification.
- Update behavior validation.

Repeated executions produced identical database state.

---

## Risks

Persistence logic becomes more dependent on accurate record identification.

Incorrect matching rules could update the wrong records.

---

## Trade-offs

### Advantages

- Reliable persistence
- Idempotent execution
- Reduced duplicate records

### Costs

- Additional lookup before persistence.
- Slightly more complex write operations.

---

## Engineering Principles Reinforced

- Idempotency
- Data Integrity
- Reliable Persistence
- Consistent State Management

---

## Lessons Learned

Long-running ingestion systems should assume repeated execution and design persistence to be idempotent.

Reliable persistence is more important than minimizing individual database operations.

---

## Future Considerations

- Batch persistence
- Transaction monitoring
- Persistence metrics
- Automatic integrity verification

---

## Evidence

### Verification

- Database inspection
- Repeated scraper execution
- Duplicate record validation

### Related Components

- Database Layer
- Persistence Service
- Job Processing Pipeline

---

## Engineering Assessment

### Immediate Outcome

Repeated scraper executions produced consistent database state.

### Architectural Outcome

Persistence became idempotent rather than execution-dependent.

### Long-term Benefit

Future scraper executions can safely rerun without introducing duplicate or inconsistent data.