# Engineering Incidents

## Overview

This directory documents significant engineering issues identified and resolved during the development of the Job Scraper platform.

Unlike architecture documentation, which explains how the system is designed, these documents describe how real engineering problems were investigated, resolved, and validated. Each incident captures the technical reasoning behind the solution, the trade-offs considered, and the lessons learned.

The objective is to preserve engineering knowledge, provide historical context for major changes, and document decisions that improved system reliability, data quality, and maintainability.

---

## Scope

Only incidents with a measurable impact on the system are documented. These include:

- Data quality issues
- Database reliability
- Scraper execution failures
- Processing pipeline improvements
- Persistence and deduplication issues
- Deployment and infrastructure problems
- Backend reliability improvements

The following are intentionally excluded:

- UI styling changes
- Documentation updates
- Dependency upgrades without behavioral changes
- Routine refactoring
- Minor bug fixes with limited engineering impact

---

## Incident Lifecycle

Each incident follows the same lifecycle:

```text
Discovery
    ↓
Investigation
    ↓
Root Cause Analysis
    ↓
Solution Design
    ↓
Implementation
    ↓
Validation
    ↓
Lessons Learned
```

---

## Documentation Standard

Every incident follows a consistent structure.

1. Metadata
2. Executive Summary
3. Timeline
4. Background
5. Problem Statement
6. System Impact
7. Root Cause Analysis
8. Investigation
9. Solution
10. Implementation Notes
11. Risks
12. Validation
13. Trade-offs
14. Engineering Principles Reinforced
15. Lessons Learned
16. Future Considerations
17. Evidence
18. Engineering Assessment

Not every section is mandatory. Sections may be omitted when they do not add meaningful technical value.

---

## Writing Principles

Engineering incidents are written using the following principles:

- Be factual and evidence-based.
- Describe the problem before the solution.
- Explain technical reasoning, not just implementation.
- Keep explanations concise and unambiguous.
- Avoid unsupported claims or performance estimates.
- Reference related architecture documents and engineering decisions where appropriate.

---

## Relationship to Other Documentation

| Documentation | Purpose |
|--------------|---------|
| `architecture/` | Explains how the system is designed. |
| `engineering-decisions/` | Explains why architectural decisions were made. |
| `engineering-incidents/` | Explains how significant engineering problems were identified and resolved. |
| `guides/` | Describes operational and development workflows. |
| `reference/` | Provides technical reference material. |

These documents complement one another and should be read together for a complete understanding of the project.

---

## Incident Index

| ID | Title | Category | Status |
|----|-------|----------|--------|
| 0001 | Description Extraction & Normalization | Data Quality | Resolved |
| 0002 | PostgreSQL Connection Timeout Handling | Reliability | Resolved |
| 0003 | Semantic Duplicate Detection | Data Quality | Resolved |
| 0004 | Database Persistence Reliability | Database | Resolved |
| 0005 | Scraper Resilience | Reliability | Resolved |
| 0006 | Browser Resource Management | Performance | Resolved |
| 0007 | Administrative Scraper Reliability | Operations | Resolved |
| 0008 | Job Ordering Logic | Business Logic | Resolved |
| 0009 | Authentication & Deployment Reliability | Infrastructure | Resolved |
| 0010 | Backend Data Consistency | Data Quality | Resolved |

---

## Maintenance

Engineering incidents should be updated only when:

- New evidence changes the understanding of an incident.
- A follow-up incident supersedes an earlier solution.
- Additional implementation details become relevant for future maintenance.

Incidents are historical engineering records and should not be rewritten to reflect later architectural changes.