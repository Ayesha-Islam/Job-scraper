# Monitoring & Observability

## Decision Record

| Field                       | Value                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                          |
| **Decision**                | Integrate monitoring directly into the scraping pipeline by collecting operational metrics, provider health information, quality statistics, and execution summaries during every scraping cycle. |
| **Date**                    | June 2026                                                                                                                                                                                         |
| **Owner**                   | JobScraper Architecture                                                                                                                                                                           |
| **Related Components**      | `scrape.ts`, `job.processor.ts`, `health.controller.ts`, `stats.controller.ts`                                                                                                                    |
| **Alternatives Considered** | Console logging only, external monitoring only, pipeline-integrated monitoring                                                                                                                    |
| **Primary Motivation**      | Make scraper quality measurable and detect provider regressions before they impact database quality.                                                                                              |

---

# Summary

Monitoring in JobScraper is treated as an architectural component rather than an operational afterthought.

Every scraping cycle produces structured operational information describing:

* Provider health
* Execution performance
* Data quality
* Processing outcomes
* Validation results
* Enrichment effectiveness

These metrics allow developers to evaluate not only whether a scraper completed successfully, but whether it produced useful data.

This distinction is particularly important in scraping systems, where a successful HTTP request does not necessarily indicate successful extraction.

---

# Problem Statement

Traditional scraping projects often answer only one question:

> "Did the scraper run?"

For a production-oriented aggregation platform, this is insufficient.

A scraper may complete successfully while still producing:

* Empty descriptions
* Duplicate jobs
* Navigation pages
* Authentication pages
* Invalid metadata
* Low-quality extraction

Without additional monitoring, these issues remain invisible until users notice them.

Monitoring therefore focuses on measuring **data quality** rather than merely execution status.

---

# Background

Scrapers interact with systems that are outside the application's control.

Provider websites change frequently.

Examples include:

* HTML structure changes
* CSS selector changes
* New authentication requirements
* Pagination changes
* Removed metadata
* Temporary outages

These changes rarely produce application crashes.

Instead, they silently reduce extraction quality.

The monitoring system exists to detect these degradations automatically.

---

# Design Goals

The monitoring subsystem was designed around five principles.

## Measure Data Quality

Execution success alone is not sufficient.

Monitoring should report whether extracted data is actually usable.

---

## Provider Independence

Every provider should produce comparable operational metrics regardless of its implementation.

---

## Failure Isolation

Metrics should identify failures at the provider level rather than reporting only the status of the overall scraping run.

---

## Operational Visibility

Developers should be able to understand:

* What happened?
* Where did it happen?
* Why did it happen?
* How severe was the issue?

without manually inspecting the database.

---

## Lightweight Implementation

Monitoring should add minimal overhead to the scraping process while providing meaningful insight.

---

# Alternatives Considered

## Console Logging Only

Advantages

* Simple implementation

Disadvantages

* Difficult to analyze
* No structured metrics
* Poor visibility into data quality

**Rejected**

---

## External Monitoring Only

Advantages

* Centralized dashboards
* Alerting capabilities

Disadvantages

* Cannot measure scraper-specific quality metrics
* Requires additional infrastructure

**Rejected**

---

## Pipeline-Integrated Monitoring

Advantages

* Direct access to processing information
* High-quality operational metrics
* Provider-specific reporting
* Minimal duplication

Disadvantages

* Additional implementation complexity

**Selected**

---

# Selected Design

Monitoring is integrated directly into the processing pipeline.

```mermaid
flowchart LR

Provider

-->

Job Processor

-->

Metrics

-->

Health Summary

-->

Statistics API
```

Operational metrics are collected as the pipeline executes rather than reconstructed afterwards.

---

# Monitoring Architecture

Several components contribute to monitoring.

```text
Provider

↓

job.processor.ts

↓

scrape.ts

↓

Health Controller

↓

Statistics Controller
```

Each component is responsible for a different aspect of observability.

---

# Why `job.processor.ts` Collects Metrics

The processor has complete visibility into every decision made during validation.

Examples include:

* Accepted jobs
* Rejected jobs
* Duplicate detection
* Enrichment results
* Validation failures
* Processing duration

Collecting metrics here avoids reconstructing information later.

---

# Why `scrape.ts` Produces Summaries

Individual providers report detailed processing information.

`scrape.ts` aggregates this information into a provider-level execution summary.

Typical summaries include:

* Execution duration
* Jobs discovered
* Jobs persisted
* Duplicate count
* Warning count
* Provider health

This provides an operational overview of the entire scraping cycle.

---

# Provider Health

JobScraper evaluates provider health using multiple signals.

Examples include:

* Successful execution
* Extraction failures
* Warning frequency
* Enrichment success rate
* Validation failures
* Data completeness

A provider may therefore be marked as degraded even when execution completed successfully.

This distinction improves operational awareness.

---

# Quality Metrics

The monitoring system tracks indicators describing the quality of extracted data.

Examples include:

* Accepted jobs
* Rejected jobs
* Duplicate jobs
* Average description length
* Enrichment success
* Empty descriptions
* Failed extractions

These metrics provide early warning when provider behavior changes.

---

# Skip Reasons

One of the most useful monitoring features is the recording of skip reasons.

Rather than simply reporting that a job was rejected, the processor records *why* it was rejected.

Typical reasons include:

* Missing required fields
* Duplicate listing
* Invalid location
* Empty description
* Failed quality validation
* Provider-specific validation failure

This information dramatically simplifies debugging and improves confidence in pipeline behavior.

---

# Warnings

Not every issue should terminate processing.

Some situations indicate degraded quality rather than complete failure.

Examples include:

* High enrichment failure rate
* Unexpected HTML structure
* Repeated extraction fallback
* Provider-specific anomalies

Warnings allow these situations to be monitored without interrupting the scraping process.

---

# Health Endpoints

The monitoring subsystem exposes operational information through dedicated API endpoints.

These endpoints allow external systems or developers to inspect application health without accessing internal implementation details.

Typical information includes:

* Database connectivity
* Redis connectivity
* Application status
* Scraping status
* Provider summaries

Separating health reporting from business APIs improves operational clarity.

---

# Statistics

Beyond health checks, JobScraper exposes aggregate statistics describing the current state of the system.

Examples include:

* Total jobs
* Provider distribution
* Processing statistics
* Scraping summaries

These endpoints provide a lightweight operational dashboard for the application.

---

# Failure Handling

Monitoring must remain non-invasive.

If metrics collection encounters an error:

* Scraping continues
* Processing continues
* Persistence continues

Monitoring should never become a single point of failure.

---

# Engineering Decisions

## Why Measure Quality Instead of Execution?

A scraper that successfully downloads an authentication page has technically executed successfully.

However, it has produced no useful data.

Measuring quality instead of execution provides a more meaningful representation of scraper health.

---

## Why Record Skip Reasons?

Knowing that 50 jobs were rejected is far less valuable than knowing **why** they were rejected.

Skip reasons transform rejection counts into actionable operational information.

---

## Why Produce Provider Summaries?

Provider-level summaries allow developers to identify regressions without inspecting thousands of individual jobs.

This significantly improves debugging efficiency.

---

## Why Separate Health and Statistics?

Health endpoints answer:

> "Is the system operational?"

Statistics answer:

> "How is the system performing?"

These are related but distinct operational concerns.

---

# Performance Considerations

Monitoring is designed to be lightweight.

Metrics are collected during normal processing rather than through additional database queries.

This minimizes overhead while providing comprehensive operational insight.

---

# Trade-offs

Advantages

* Excellent operational visibility
* Faster debugging
* Early detection of provider regressions
* Better understanding of data quality
* Minimal runtime overhead

Disadvantages

* Additional implementation complexity
* More operational data to interpret
* Slight increase in processing logic

These trade-offs were accepted because they significantly improve the reliability and maintainability of the scraping platform.

---

# Future Improvements

Potential enhancements include:

* OpenTelemetry integration
* Prometheus metrics
* Grafana dashboards
* Automatic provider alerts
* Historical quality trends
* Structured event logging
* Distributed tracing

The current monitoring architecture provides a strong foundation for these capabilities.

---

# Related Documentation

This document describes the monitoring architecture.

Related documents include:

* Scheduler
* Job Processing Pipeline
* Description Enrichment
* Search System
* Deployment
* Engineering Decision: Monitoring Strategy
