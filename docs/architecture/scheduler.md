# Scheduler

## Decision Record

| Field                       | Value                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                    |
| **Decision**                | Separate scraping orchestration from both HTTP request handling and provider implementations through a dedicated scheduler. |
| **Date**                    | June 2026                                                                                                                   |
| **Owner**                   | JobScraper Architecture                                                                                                     |
| **Related Components**      | `scheduler.ts`, `scrape.ts`, `job.processor.ts`, Provider Scrapers                                                          |
| **Alternatives Considered** | Manual execution, HTTP-triggered scraping, embedded provider logic, queue-based scheduling                                  |
| **Primary Motivation**      | Execute scraping independently, isolate provider failures, and centralize orchestration and monitoring.                     |

---

# Summary

The Scheduler is responsible for orchestrating every scraping cycle within JobScraper.

Rather than embedding execution logic inside individual providers or exposing scraping through HTTP endpoints, JobScraper introduces a dedicated scheduling layer responsible for coordinating providers, measuring execution, collecting operational metrics, and initiating the job processing pipeline.

This separation ensures that scraping remains an independent background process while the REST API continues serving users without interruption.

---

# Problem Statement

Collecting jobs from multiple providers introduces orchestration challenges beyond simply running a scraper.

Examples include:

* Determining when providers should execute
* Coordinating multiple providers
* Handling provider failures
* Measuring execution time
* Collecting operational metrics
* Preventing one provider from stopping the entire scraping run

Without a dedicated scheduler, these concerns would become scattered throughout the application.

---

# Background

Early scraper implementations often execute providers sequentially from a script.

While suitable for experimentation, this approach becomes difficult to maintain as the number of providers grows.

Responsibilities such as:

* scheduling
* logging
* retry handling
* provider health
* metrics collection

quickly become intertwined with extraction logic.

JobScraper separates orchestration from extraction so that providers remain focused solely on collecting data.

---

# Design Goals

The scheduler was designed around the following objectives.

## Independent Execution

Scraping should operate independently of user requests.

The availability of the REST API should not depend on whether a scraping cycle is currently executing.

---

## Provider Isolation

Each provider should execute independently.

A failure in one provider must not prevent the remaining providers from running.

---

## Centralized Orchestration

Scheduling decisions should exist in one place rather than being duplicated across providers.

---

## Operational Visibility

Every scraping cycle should generate metrics describing:

* execution duration
* provider status
* accepted jobs
* rejected jobs
* warnings
* failures

---

## Extensibility

New providers should automatically participate in scheduled scraping without requiring architectural changes.

---

# Alternatives Considered

## Manual Execution

Advantages

* Extremely simple

Disadvantages

* No automation
* Unsuitable for production

**Rejected**

---

## HTTP Endpoint Trigger

Advantages

* Easy to trigger manually

Disadvantages

* Couples background work to request handling
* Long-running requests
* Poor operational model

**Rejected**

---

## Provider Self-Scheduling

Advantages

* Independent providers

Disadvantages

* Duplicated scheduling logic
* Difficult monitoring
* Harder coordination

**Rejected**

---

## Dedicated Scheduler

Advantages

* Centralized orchestration
* Consistent metrics
* Failure isolation
* Easier maintenance

Disadvantages

* Additional architectural component

**Selected**

---

# Selected Design

The scheduler coordinates the entire scraping lifecycle.

```mermaid
flowchart LR

Scheduler

-->

Scrape Coordinator

-->

Provider

-->

Job Processor

-->

Database
```

The scheduler owns execution.

Providers own extraction.

The processor owns business rules.

---

# Architecture

The scheduling subsystem is primarily composed of two files.

```text
scheduler.ts

↓

Schedules scraping cycles

↓

scrape.ts

↓

Coordinates providers

↓

job.processor.ts

↓

Validation & Persistence
```

Each layer owns a distinct responsibility.

---

# Why `scheduler.ts` Exists

The scheduler is responsible only for deciding **when** scraping should occur.

Typical responsibilities include:

* Register scheduled jobs
* Start scraping cycles
* Coordinate application startup
* Separate background work from HTTP requests

Importantly, it does **not** contain provider-specific logic.

---

# Why `scrape.ts` Exists

While the scheduler determines *when* to execute, `scrape.ts` determines *how* a scraping cycle is executed.

Responsibilities include:

* Initializing providers
* Executing providers
* Aggregating results
* Passing jobs to the processing pipeline
* Collecting execution statistics
* Producing provider summaries

This separation keeps scheduling concerns independent from scraping orchestration.

---

# Scraping Lifecycle

Every scheduled run follows the same sequence.

```mermaid
flowchart TD

Scheduler

↓

Initialize Run

↓

Execute Provider

↓

Normalize Jobs

↓

Process Jobs

↓

Persist Data

↓

Collect Metrics

↓

Generate Summary

↓

Complete Run
```

This lifecycle is identical regardless of how many providers participate.

---

# Provider Execution

Each provider executes independently.

Conceptually:

```text
Provider A

↓

Complete

Provider B

↓

Complete

Provider C

↓

Complete
```

Failures remain isolated to the individual provider.

The scheduler proceeds to the next provider regardless of previous failures.

---

# Failure Isolation

Failure isolation is one of the most important architectural characteristics of the scheduler.

Example:

```text
LinkedIn

✓

RemoteOK

✓

RemoteHub

✗

WWR

✓
```

The failure of RemoteHub should not prevent LinkedIn, RemoteOK, or WWR from completing.

The scheduler records the failure while allowing the scraping cycle to continue.

This significantly improves resilience.

---

# Metrics Collection

Every scraping run produces operational metrics.

Examples include:

* Provider execution time
* Jobs discovered
* Jobs accepted
* Jobs rejected
* Duplicate count
* Enrichment success
* Warning count
* Failure count

These metrics provide visibility into scraper health and simplify diagnosing provider regressions.

---

# Provider Health

The scheduler also evaluates the operational health of each provider.

Typical indicators include:

* Successful execution
* High rejection rates
* Extraction failures
* Repeated warnings
* Enrichment degradation

Provider health allows issues to be identified before they significantly impact database quality.

---

# Why the Scheduler Does Not Process Jobs

The scheduler intentionally delegates processing to the Job Processor.

Its responsibilities end once providers have produced normalized jobs.

The scheduler does **not**:

* validate jobs
* enrich descriptions
* remove duplicates
* write to the database

Delegating these responsibilities keeps orchestration independent from business logic.

---

# Engineering Decisions

## Why Separate Scheduling from HTTP?

Scraping is a background process.

Running it inside request handlers would increase latency and tightly couple two unrelated execution paths.

---

## Why Centralize Execution?

Having one orchestration layer provides consistent logging, metrics, and lifecycle management across every provider.

---

## Why Continue After Failures?

External providers are inherently unreliable.

Treating provider failures as isolated operational events improves overall system availability.

---

## Why Collect Metrics During Execution?

Metrics transform the scheduler from a simple timer into an operational monitoring component.

Without them, identifying provider regressions would require manual investigation.

---

# Performance Considerations

The scheduler minimizes unnecessary overhead by:

* Reusing shared processing logic
* Avoiding duplicated provider coordination
* Isolating failures
* Producing lightweight operational summaries

As additional providers are added, orchestration complexity grows slowly because scheduling remains centralized.

---

# Trade-offs

Advantages

* Centralized orchestration
* Provider isolation
* Better monitoring
* Easier maintenance
* Predictable execution lifecycle

Disadvantages

* Additional architectural layer
* Separate scheduling infrastructure
* Coordination logic distinct from providers

These trade-offs were accepted because they improve maintainability and operational visibility.

---

# Future Improvements

Potential enhancements include:

* Concurrent provider execution
* Distributed workers
* Queue-based scheduling
* Retry policies
* Priority scheduling
* Adaptive execution frequency
* Provider-specific concurrency limits

The current design intentionally keeps orchestration simple while allowing these capabilities to be introduced later.

---

# Related Documentation

This document explains scraping orchestration.

Related architecture documents include:

* Scraper Engine
* Job Processing Pipeline
* Monitoring
* Database Design
* Caching
* Deployment
* Engineering Decision: Provider Architecture
