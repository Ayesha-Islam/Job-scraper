# Folder Structure Reference

## Overview

JobScraper follows a monorepo-style project structure consisting of two primary applications:

* **Backend API** (`api/`)
* **Frontend** (`frontend/`)

Supporting infrastructure, documentation, and configuration are organized into dedicated top-level directories.

This document describes the purpose of each major directory and how they relate to one another.

---

# Repository Structure

```text
JobScraper/
├── api/
├── frontend/
├── docs/
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# Top-Level Directories

## `api/`

Contains the backend application.

Responsibilities include:

* REST API
* Authentication
* Job search
* Scraper engine
* Scheduler
* Database access
* Redis caching
* Metrics collection

Primary technologies:

* Express
* TypeScript
* Prisma
* PostgreSQL
* Redis
* Playwright

---

## `frontend/`

Contains the Next.js application.

Responsibilities include:

* User interface
* Authentication flow
* Search interface
* Saved jobs
* Job detail pages
* API communication

Primary technologies:

* Next.js
* React
* TypeScript
* Tailwind CSS
* NextAuth

---

## `docs/`

Contains project documentation.

Documentation is organized into four categories:

```text
docs/

architecture/

guides/

reference/

engineering-decisions/
```

Each category serves a different purpose.

---

# Backend Structure

```text
api/
├── prisma/
├── src/
├── package.json
├── Dockerfile
└── tsconfig.json
```

---

## `prisma/`

Contains database-related resources.

Typical contents:

```text
prisma/
├── schema.prisma
└── migrations/
```

Responsibilities:

* Database schema
* Migration history
* Prisma configuration

---

## `src/`

Contains the application source code.

Most backend development occurs within this directory.

---

# `src/controllers/`

Responsibilities:

* Handle HTTP requests
* Validate request parameters
* Delegate work to services
* Return API responses

Controllers should remain thin.

Business logic belongs in services.

---

# `src/services/`

Contains the application's business logic.

Examples include:

* Job processing
* Search
* Validation
* Authentication
* Description enrichment

Services coordinate application behavior independently of HTTP.

---

# `src/routes/`

Defines API routes and associates them with controllers.

Responsibilities include:

* Route registration
* Middleware attachment
* Endpoint organization

---

# `src/lib/`

Contains shared infrastructure utilities.

Examples:

* SQL generation
* Prisma client
* Shared helpers

This directory contains reusable functionality rather than business logic.

---

# `src/cache.ts`

Responsible for:

* Redis initialization
* Cache management
* Redis connection lifecycle

---

# `src/config.ts`

Centralized application configuration.

Responsibilities:

* Environment variables
* Runtime defaults
* Configuration validation

---

# `src/container.ts`

Creates and initializes shared application dependencies.

Typical responsibilities:

* Dependency initialization
* Service wiring
* Application startup

---

# `src/scheduler.ts`

Coordinates scheduled scraping execution.

Responsibilities:

* Scheduling
* Triggering scraping cycles
* Background execution

---

# `src/scrape.ts`

Coordinates provider execution.

Responsibilities:

* Initialize providers
* Execute scraping
* Aggregate results
* Produce summaries

---

# Frontend Structure

```text
frontend/
├── app/
├── components/
├── lib/
├── public/
└── package.json
```

---

# `app/`

Contains application routes using the Next.js App Router.

Responsibilities:

* Page composition
* Layouts
* Route hierarchy

---

# `components/`

Contains reusable UI components.

Examples:

* Job cards
* Search bar
* Filter panel
* Navigation
* Authentication components

Components should remain presentation-focused.

---

# `lib/`

Contains reusable frontend utilities.

Typical responsibilities:

* API client
* Shared helpers
* Utility functions

---

# `public/`

Contains static assets.

Examples:

* Images
* Icons
* Favicon

---

# Documentation Structure

```text
docs/

architecture/

guides/

reference/

engineering-decisions/
```

---

## `architecture/`

Explains:

* System design
* Engineering decisions
* Component interaction
* Data flow

---

## `guides/`

Task-oriented documentation.

Examples:

* Local development
* Docker
* Testing
* Adding providers
* Prisma migrations

---

## `reference/`

Implementation reference.

Examples:

* API
* Environment variables
* Database schema
* Folder structure
* Scraper interface

---

## `engineering-decisions/`

Architecture Decision Records (ADRs).

Documents the reasoning behind major implementation choices.

---

# Configuration Files

## `docker-compose.yml`

Defines the local multi-container development environment.

---

## `Dockerfile`

Defines container images for the frontend and backend.

---

## `package.json`

Declares:

* Dependencies
* Scripts
* Tooling

Each application maintains its own `package.json`.

---

## `tsconfig.json`

Defines TypeScript compiler settings.

Separate configurations are maintained for the frontend and backend.

---

# Design Principles

The repository structure follows several principles:

* Separation of concerns
* Feature isolation
* Reusable components
* Clear ownership
* Minimal coupling

Every major directory has a single primary responsibility.

---

# Navigation Guide

If you want to...

| Task                   | Directory                                  |
| ---------------------- | ------------------------------------------ |
| Add a new scraper      | `api/src/providers/`                       |
| Modify search          | `api/src/services/` + `api/src/lib/`       |
| Update database schema | `api/prisma/`                              |
| Add API endpoint       | `api/src/controllers/` + `api/src/routes/` |
| Update UI              | `frontend/components/`                     |
| Add page               | `frontend/app/`                            |
| Update documentation   | `docs/`                                    |

---

# Related Documentation

* Architecture Overview
* Local Development Guide
* API Reference
* Database Schema Reference
* Engineering Decision Records
