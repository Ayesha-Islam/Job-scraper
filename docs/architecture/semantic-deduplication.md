# Semantic Deduplication

## Decision Record

| Field                       | Value                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                       |
| **Decision**                | Use normalized business keys (`companyKey`, `positionKey`, `locationKey`) as the logical identity of a job instead of provider-generated URLs. |
| **Date**                    | June 2026                                                                                                                                      |
| **Owner**                   | JobScraper Architecture                                                                                                                        |
| **Related Components**      | Job Processor, Database Schema, Search System                                                                                                  |
| **Alternatives Considered** | URL hashing, title matching, company + title matching, description similarity, embedding similarity                                            |
| **Primary Motivation**      | Detect duplicate jobs across multiple providers while maintaining deterministic, high-performance inserts.                                     |

---

## Summary

One of the primary challenges when aggregating jobs from multiple providers is duplicate detection.

The same position frequently appears on several job boards simultaneously. Although these listings represent the same employment opportunity, they often have different URLs, formatting, publication dates, and provider-specific metadata.

JobScraper solves this problem through **semantic deduplication**, a strategy that identifies jobs based on normalized business attributes rather than provider-generated identifiers.

Instead of treating a URL as the identity of a job, JobScraper considers **the combination of company, position, and location** to represent the logical identity of a listing.

This document explains why this approach was chosen, the alternatives that were considered, and the trade-offs involved.

---

## Decision Outcome

After evaluating several approaches, JobScraper adopted a deterministic deduplication strategy based on normalized business keys.

The chosen design provides:

* Provider-independent duplicate detection
* Database-enforced consistency
* Efficient indexed lookups
* Predictable insertion behavior
* Minimal computational overhead

While this approach cannot detect every semantic variation, it provides an excellent balance between accuracy, simplicity, and performance for a production-oriented aggregation system.

The remainder of this document explains the reasoning behind this decision, the implementation details, and the limitations that informed future improvements.

<!-- Continue with the rest of the document exactly as previously written -->
