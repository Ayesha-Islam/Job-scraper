# Job Scraper

## Overview

Job Scraper is a full-stack web application for scraping, aggregating, and browsing job listings from multiple sources. It features a robust backend API built with Node.js, Express, Prisma, and PostgreSQL, and a modern frontend built with Next.js and Tailwind CSS. The platform supports user authentication, job search, filtering, saving jobs, and statistics.

---

## Features

- **Automated Job Scraping:** Scrapes jobs from various sources using Puppeteer and Cheerio.
- **RESTful API:** Provides endpoints for jobs, search, statistics, authentication, and health checks.
- **User Authentication:** Secure registration and login with JWT and bcrypt.
- **Job Search & Filtering:** Search by keyword, company, location, type, and source.
- **Save Jobs:** Users can save/unsave jobs to their profile.
- **Statistics:** View stats like total jobs and jobs added today.
- **Responsive Frontend:** Next.js app with modern UI, filtering, pagination, and job details modal.
- **Caching:** Uses Redis for caching job data and improving performance.
- **Admin Controls:** (If implemented) Admin endpoints for managing jobs and users.

---

## Architecture

```
├── api/         # Backend API (Node.js, Express, Prisma)
│   ├── src/
│   │   ├── controllers/   # Route controllers (auth, job, stats, etc.)
│   │   ├── services/      # Business logic (job scraping, stats, etc.)
│   │   ├── lib/           # Prisma client, helpers
│   │   ├── routes/        # API route definitions
│   │   ├── types.ts       # TypeScript types/interfaces
│   │   ├── app.ts         # Express app setup
│   │   ├── scrape.ts      # Scraper logic (Puppeteer, Cheerio)
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── migrations/    # Prisma migrations
│   ├── package.json       # Backend dependencies/scripts
│   └── ...
├── frontend/    # Frontend (Next.js, React, Tailwind)
│   ├── app/     # Next.js app directory
│   ├── components/        # UI components (JobCard, BrowseJobs, etc.)
│   ├── lib/               # API helpers, auth utils
│   ├── types/             # Shared TypeScript types
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies/scripts
│   └── ...
└── README.md   # Project documentation
```

---

## Backend (API)

- **Framework:** Node.js, Express
- **Database:** PostgreSQL (via Prisma ORM)
- **Caching:** Redis (via ioredis)
- **Scraping:** Puppeteer, Cheerio
- **Authentication:** JWT, bcryptjs
- **API Endpoints:**
	- `/api/v1/jobs` - List, filter, and search jobs
	- `/api/v1/jobs/search` - Advanced search
	- `/api/v1/jobs/:id` - Get job details
	- `/api/v1/stats` - Get job statistics
	- `/api/v1/auth/register` - Register user
	- `/api/v1/auth/login` - Login user
	- `/api/v1/health` - Health check

### Database Schema (Prisma)

- **Job**: id, company, position, location, salary, type, url, source, description, hash, postedAt, isActive, scrapedAt, createdAt, updatedAt
- **User**: id, email, password, name, created_at, updated_at

### Scraping Logic

- Uses Puppeteer to automate browser and Cheerio to parse HTML.
- Extracts job data, normalizes, and stores in PostgreSQL.
- Deduplication via hash and unique constraints.
- Supports job types: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP.

### Business Logic

- **JobService:** Handles job fetching, filtering, pagination, and stats.
- **AuthController:** Handles registration, login, password hashing, JWT issuance.
- **StatsController:** Aggregates job statistics.
- **CacheService:** Caches job data for performance.

---

## Frontend (Next.js)

- **Framework:** Next.js (App Router), React, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide icons
- **Pages:**
	- `/` - Landing page
	- `/jobs` - Browse/search jobs
	- `/jobs/[id]` - Job details modal
	- `/saved-jobs` - Saved jobs
	- `/profile` - User profile
	- `/stats` - Statistics
	- `/auth/login` - Login
	- `/auth/register` - Register
### Main Components

- **Landing:** Hero section, search bar, get started
- **JobCard:** Displays job summary
- **JobDetailModal:** Shows full job details
- **SavedJobs:** List of saved jobs
- **FilterPanel:** Filtering by type, location, company, etc.
- **NavBar, Footer, Pagination, ProtectedRoutes, etc.**

### 1. Clone the repository
git clone https://github.com/Ayesha-Islam/Job-scraper.git
```

### 2. Backend Setup
cd api
cp .env.example .env   # Set DB, JWT, REDIS config
npm install
npm run prisma:migrate
npm run dev
```
### 3. Frontend Setup
```sh
cp .env.example .env   # Set NEXTAUTH_URL, API URL, etc.
npm install
npm run dev
```

---

## Usage

1. Start backend API (`api/`): `npm run dev`
2. Start frontend (`frontend/`): `npm run dev`
3. Access the app at [http://localhost:3000](http://localhost:3000)
4. Register/login, browse jobs, search/filter, save jobs, view stats.

---

## API Reference (Sample)

### `GET /api/v1/jobs`

### `GET /api/v1/stats`

---

## Business Logic Details

- **Job Scraping:**
	- Scraper runs on demand or schedule, fetches jobs from sources, parses, deduplicates, and stores.
	- Hashing and unique constraints prevent duplicates.
	- Scraping logic is modular for easy source extension.
- **Job Filtering & Search:**
	- Multi-criteria filtering (search, company, location, type, source, sort).
	- Pagination and sorting (recent, oldest, salary).
- **User Auth:**
	- Registration and login with validation, password hashing, JWT issuance.
	- User data stored securely in PostgreSQL.
- **Caching:**
	- Redis used to cache job queries and stats for performance.

---

## Technologies Used

- **Backend:** Node.js, Express, Prisma, PostgreSQL, Redis, Puppeteer, Cheerio
- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui, Lucide
- **Auth:** JWT, bcryptjs, next-auth
- **Other:** TypeScript, Docker (optional), ESLint, Prettier

---

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements, bug fixes, or new features.

---

## License

This project is licensed under the ISC License.