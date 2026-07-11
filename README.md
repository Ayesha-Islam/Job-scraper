# Job Scraper

## What is Job Scraper?

Job Scraper is a full-stack app for collecting, searching, and browsing job listings from multiple providers. It pairs an Express API with a Next.js frontend and uses PostgreSQL, Redis, and browser scraping to keep listings live and searchable.

## Features

- Automated scraping from external job sources
- Search and filter jobs by keyword, location, source, and type
- User registration, login, and saved jobs
- Admin controls for scraping and cache management
- Redis caching for faster query responses
- Health checks for API, database, and Redis

## Tech Stack

- Backend: Node.js, Express, Prisma, PostgreSQL, Redis
- Scraping: Puppeteer, Cheerio
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Auth: JWT, bcryptjs, NextAuth
- Dev tools: Docker, Vitest, Prisma

## Repository Layout

- `api/` — backend service, routes, scraping, and database schema
- `frontend/` — Next.js UI, auth, and API integration
- `docs/` — detailed architecture, environment, and API references
- `docker-compose.yml` — local Docker development stack
- `DOCKER_SETUP.md` — Docker usage and troubleshooting

## Quick Start

### Clone the repository

```bash
git clone https://github.com/Ayesha-Islam/Job-scraper.git
cd Job-scraper
```

### Start the backend

```bash
cd api
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend default: `http://localhost:3001`

### Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend default: `http://localhost:3000`

## Docker

Start the full stack:

```bash
docker compose up --build
```

Stop services:

```bash
docker compose down
```

Remove local database/cache data:

```bash
docker compose down -v
```

## Environment Configuration

The README keeps environment settings brief. Full variables are documented in `docs/reference/environment-variables.md`.

Backend environment file: `api/.env`
Frontend environment file: `frontend/.env.local`

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` / `REDIS_HOST` + `REDIS_PORT` — Redis config
- `JWT_SECRET` — backend auth signing secret
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — frontend auth secrets
- `NEXTAUTH_URL` — frontend public URL
- `NEXT_PUBLIC_API_URL` / `INTERNAL_API_URL` — API base URLs

## API Overview

Base path: `/api/v1`

- `GET /jobs` — list and filter jobs
- `GET /jobs/search` — advanced search
- `GET /jobs/:id` — job details
- `GET /stats` — application statistics
- `POST /auth/register` — register user
- `POST /auth/login` — login
- `GET /auth/me` — current user info
- `POST /admin/scrape` — trigger scraping
- `DELETE /admin/cache` — clear cache

For a complete API reference, see `docs/reference/api.md`.

## Architecture Summary

- `api/src/app.ts` — Express app and middleware setup
- `api/src/routes/index.ts` — API route definitions
- `api/src/controllers/` — controllers for auth, jobs, stats, admin flows
- `api/src/services/` — scraped data processing, caching, and business rules
- `api/prisma/schema.prisma` — database models for jobs and users
- `frontend/app/` — Next.js pages and route handlers
- `frontend/components/` — visual UI components
- `frontend/lib/` — API client and auth utilities

For design rationale, see `docs/architecture/overview.md`.

## Run the App

1. Start backend: `npm run dev` (from `api/`)
2. Start frontend: `npm run dev` (from `frontend/`)
3. Open `http://localhost:3000`

## Contributing

Contributions are welcome. Open issues or pull requests for bug fixes, improvements, or documentation updates.

## License

Licensed under the ISC License.
