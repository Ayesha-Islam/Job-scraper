---
Incident: 0003
Title: Semantic Deduplication
Category: Data Quality
Severity: High
Status: Resolved

First Observed: During integration of multiple job providers

Affected Components:
- Job Processing Pipeline
- Database Layer
- Deduplication Service

Related Documentation:
- ../architecture/semantic-deduplication.md
- ../architecture/job-processing-pipeline.md
- ../architecture/database-design.md

Related ADRs:
- ../engineering-decisions/0002-semantic-deduplication.md
---

# Engineering Incident 0003: Semantic Deduplication

## Executive Summary

Jobs from different providers frequently represented the same position but used different URLs and formatting. URL-based deduplication failed to identify these duplicates, resulting in multiple records for the same job.

A semantic deduplication strategy was introduced using normalized company, position, and location keys. This enabled reliable duplicate detection across providers before persistence.

---

## Timeline

| Phase | Description |
|--------|-------------|
| Discovery | Duplicate jobs appeared from multiple providers. |
| Investigation | Compared duplicate records across providers. |
| Root Cause | URL uniqueness did not represent job uniqueness. |
| Resolution | Introduced semantic deduplication using normalized keys. |
| Verification | Cross-provider duplicate detection validated successfully. |

---

## Background

The platform aggregates jobs from multiple providers. Many providers publish the same vacancy using different URLs, making URL-based uniqueness unreliable.

For example, the same company may advertise the same position on multiple job boards, each generating a different record.

---

## Problem Statement

Duplicate jobs were stored because uniqueness relied on provider-specific URLs.

Observed issues included:

- Duplicate job listings
- Repeated search results
- Inconsistent saved jobs
- Reduced dataset