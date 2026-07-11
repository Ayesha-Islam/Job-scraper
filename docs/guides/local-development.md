# Local Development Guide

## Overview

This guide explains how to set up JobScraper for local development.

By the end of this guide you will have:

* PostgreSQL running
* Redis running
* Backend API running
* Frontend running
* Database migrated
* Authentication working
* Search endpoints available
* Scraper ready to execute

This guide assumes no prior knowledge of the project.

---

# Prerequisites

Before cloning the repository, install the following software.

## Required Software

| Software   | Recommended Version |
| ---------- | ------------------- |
| Node.js    | 22.x LTS            |
| npm        | Latest              |
| PostgreSQL | 16+                 |
| Redis      | 7+                  |
| Git        | Latest              |

---

## Optional

These tools improve the development experience.

* Docker Desktop / Docker Engine
* pgAdmin
* Redis Insight
* VS Code

---

# Clone the Repository

```bash
git clone <repository-url>

cd JobScraper
```

---

# Repository Structure

```text
JobScraper/

api/

frontend/

docs/
```

Development primarily occurs inside the following applications.

* `api`
* `frontend`

---

# Install Dependencies

Backend

```bash
cd api

npm install
```

Frontend

```bash
cd ../frontend

npm install
```

---

# Configure Environment Variables

Create local environment files.

Backend

```text
api/.env
```

Frontend

```text
frontend/.env.local
```

Refer to:

```text
docs/reference/environment-variables.md
```

for a complete description of every configuration option.

---

# Start PostgreSQL

Ensure PostgreSQL is running before starting the backend.

Typical development database:

```text
Host

localhost

Port

5432
```

Verify connectivity before continuing.

---

# Start Redis

Redis must be running before launching the API.

Typical configuration:

```text
Host

localhost

Port

6379
```

The backend automatically attempts to establish a Redis connection during startup.

---

# Run Database Migrations

Navigate to the backend.

```bash
cd api
```

Execute Prisma migrations.

```bash
npx prisma migrate deploy
```

During development you may instead use:

```bash
npx prisma migrate dev
```

This creates the local database schema.

---

# Generate Prisma Client

Whenever the schema changes:

```bash
npx prisma generate
```

The generated client will be used throughout the backend.

---

# Start the Backend

From the API directory:

```bash
npm run dev
```

A successful startup should include messages indicating:

* Environment loaded
* Database connected
* Redis connected
* Application initialized
* HTTP server listening

The API is available at:

```text
http://localhost:3001
```

---

# Start the Frontend

Open a second terminal.

```bash
cd frontend

npm run dev
```

The frontend is available at:

```text
http://localhost:3000
```

---

# Verify the Installation

Confirm that the following components are operational.

| Component       | Expected Result        |
| --------------- | ---------------------- |
| Frontend        | Opens successfully     |
| Backend         | Running                |
| PostgreSQL      | Connected              |
| Redis           | Connected              |
| Health Endpoint | Returns healthy status |

If all components are operational, the development environment is ready.

---

# Running the Scraper

To execute a scraping cycle manually:

```bash
cd api

npm run scrape
```

During execution you should observe:

* Provider initialization
* Job discovery
* Validation
* Semantic deduplication
* Description enrichment
* Database persistence
* Provider summaries

---

# Viewing Scraped Jobs

After a successful scraping run:

Open

```text
http://localhost:3000
```

Browse the Jobs page.

The frontend retrieves job listings through the backend API.

---

# Authentication

Authentication is optional for browsing jobs.

Authentication is required for:

* Saving jobs
* Viewing saved jobs
* User-specific features

Authentication setup is documented separately.

```text
docs/architecture/authentication.md
```

---

# Development Workflow

A typical development session follows this sequence.

```text
Pull Latest Changes

↓

Install Dependencies

↓

Start PostgreSQL

↓

Start Redis

↓

Run Migrations

↓

Start Backend

↓

Start Frontend

↓

Run Scraper (Optional)

↓

Develop

↓

Run Tests
```

---

# Common Commands

## Backend

```bash
npm run dev
```

Starts the development server.

---

```bash
npm run scrape
```

Runs every configured provider.

---

```bash
npm test
```

Runs the test suite.

---

## Prisma

```bash
npx prisma migrate dev
```

Create and apply migrations.

---

```bash
npx prisma studio
```

Launch Prisma Studio.

---

```bash
npx prisma generate
```

Generate Prisma Client.

---

## Frontend

```bash
npm run dev
```

Starts the Next.js development server.

---

# Troubleshooting

## Database Connection Failed

Verify:

* PostgreSQL is running
* Environment variables are correct
* Database exists

---

## Redis Connection Failed

Verify:

* Redis is running
* Host and port match the environment configuration

If Redis is unavailable, certain features may operate with reduced performance depending on the current configuration.

---

## Migration Errors

Ensure:

* Database credentials are correct
* Previous migrations completed successfully
* Prisma Client has been regenerated after schema changes

---

## Scraper Returns No Jobs

Possible causes include:

* Provider website changes
* Network connectivity
* Rate limiting
* Invalid environment configuration

Review backend logs and provider summaries for detailed diagnostics.

---

## Frontend Cannot Reach Backend

Verify:

* Backend is running
* API URL is correctly configured in `frontend/.env.local`
* No firewall or port conflicts exist

---

# Development Best Practices

When working on JobScraper:

* Pull the latest changes before starting work.
* Keep Prisma schema and migrations synchronized.
* Run the test suite before committing.
* Verify scraping after modifying provider implementations.
* Avoid committing `.env` files.
* Regenerate Prisma Client after schema changes.

---

# Next Steps

Once the application is running locally, the following guides are recommended:

* `docker.md`
* `adding-a-provider.md`
* `debugging-scrapers.md`
* `testing.md`
* `prisma-migrations.md`

These guides cover common development workflows in greater detail.
