# JobScraper

> A production-oriented job aggregation platform that collects remote software engineering jobs from multiple providers, enriches their content, removes duplicates using semantic matching, and exposes a unified search interface through a modern web application.

---

## Overview

JobScraper is a full-stack application designed to aggregate remote job listings from multiple public job providers into a single searchable platform.

Unlike simple web scrapers that mirror provider content, JobScraper performs multiple processing stages before a job becomes available to users. Every listing passes through a validation pipeline that normalizes provider-specific data, filters unsupported jobs, performs semantic deduplication, enriches incomplete descriptions, and stores only high-quality results.

The project was built as a portfolio application to demonstrate production-oriented backend engineering practices including scraper architecture, data processing pipelines, search optimization, caching strategies, testing, and containerized deployment.

---

## Features

* Aggregate remote software engineering jobs from multiple providers
* Provider-independent scraping architecture
* Semantic job deduplication across providers
* Provider-specific description enrichment
* Advanced filtering and search
* Pagination and sorting
* User authentication
* Save jobs for later
* Redis caching
* PostgreSQL persistence
* Docker-based development environment
* Health monitoring and provider metrics
* Comprehensive unit testing

---

## Supported Job Providers

JobScraper currently aggregates listings from multiple remote job boards.

| Provider          | Status    |
| ----------------- | --------- |
| LinkedIn          | Supported |
| RemoteOK          | Supported |
| We Work Remotely  | Supported |
| SkipTheDrive      | Supported |
| RemoteHub         | Supported |
| Hubstaff Talent   | Supported |
| Remotive          | Supported |
| Y Combinator Jobs | Supported |
| NoDesk            | Supported |

Each provider implements the same scraper contract while maintaining provider-specific extraction and enrichment logic where necessary.

---

## High-Level Architecture

```text
                    Scheduler
                        │
                        ▼
              Provider Scrapers
                        │
                        ▼
              Data Normalization
                        │
                        ▼
                Job Processor
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   Validation     Semantic Dedup     Enrichment
        │               │                │
        └───────────────┴────────────────┘
                        │
                        ▼
                 PostgreSQL Database
                        │
                        ▼
                  Redis Cache
                        │
                        ▼
                  REST API (Express)
                        │
                        ▼
             Next.js Frontend Application
```

---

## Technology Stack

### Frontend

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express
* TypeScript

### Database

* PostgreSQL
* Prisma ORM
* Raw PostgreSQL (`pg`) for optimized search queries

### Infrastructure

* Docker Compose
* Redis

### Authentication

* NextAuth

### Testing

* Vitest

---

## Why This Project Exists

Most public job boards expose listings in different formats, with varying levels of data quality. The same position frequently appears across multiple providers under different URLs, descriptions, or metadata.

JobScraper addresses these challenges by introducing a processing pipeline that focuses on data quality rather than simple aggregation.

Major engineering problems solved by the project include:

* Cross-provider duplicate detection
* Provider-specific HTML extraction
* Description enrichment
* Search performance
* Data normalization
* Source health monitoring
* Unified provider architecture

These topics are documented throughout the architecture documentation.

---

## Documentation

The complete documentation is available in the `docs` directory.

### Architecture

* Architecture Overview
* Backend Architecture
* Frontend Architecture
* Scraper Engine
* Job Processing Pipeline
* Semantic Deduplication
* Description Enrichment
* Search System
* Database Design
* Caching Strategy
* Scheduler
* Authentication
* Monitoring
* Deployment

### Guides

* Local Development
* Docker Setup
* Adding a New Provider
* Debugging Scrapers
* Testing
* Database Migrations

### Reference

* API Reference
* Database Schema
* Environment Variables
* Folder Structure
* Scraper Interface

### Engineering Decisions

* Why Prisma and Raw SQL coexist
* Why semantic deduplication was chosen
* Why provider-specific enrichment exists
* Why Redis is used
* Why the scraper interface is provider-independent

---

## Project Structure

```text
frontend/
api/
docs/
docker-compose.yml
```

A complete breakdown of the project structure is available in the documentation.

---

## Quick Start

### Clone the repository

```bash
git clone <repository-url>
cd JobScraper
```

### Start the application

```bash
docker compose up --build
```

The application will start with:

* Frontend
* Backend API
* PostgreSQL
* Redis

---

## Screenshots

Screenshots of the application are available in the project documentation.

---

## Future Improvements

Potential future enhancements include:

* Distributed scraping
* Queue-based processing
* Elasticsearch integration
* OpenTelemetry tracing
* Horizontal scraper scaling
* AI-powered job recommendations

---

## License

This project is intended as a portfolio project demonstrating production-oriented full-stack engineering practices.
