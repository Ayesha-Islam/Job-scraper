# Job Scraper Docker Setup

This project runs with Docker Compose using four services:

- **frontend**: Next.js app on `http://localhost:3000`
- **api**: Express/Node API on `http://localhost:3001`
- **postgres**: PostgreSQL database on `localhost:5432`
- **redis**: Redis cache on `localhost:6379`

## Project Layout

```txt
job-scraper/
  docker-compose.yml
  .dockerignore
  DOCKER_SETUP.md

  api/
    Dockerfile
    .dockerignore
    docker-entrypoint.sh
    .env
    package.json
    prisma/
    src/

  frontend/
    Dockerfile
    .dockerignore
    package.json
    app/
    components/
    lib/
```

## Build the Images

```bash
docker compose build
```

For a full clean rebuild:

```bash
docker compose build --no-cache
```

Use `--no-cache` only when needed because Chromium installation makes the API image slower to rebuild.

## Start the Project

```bash
docker compose up
```

Or rebuild and start together:

```bash
docker compose up --build
```

Run in the background:

```bash
docker compose up -d
```

## Stop the Project

```bash
docker compose down
```

Stop and remove database/cache volumes:

```bash
docker compose down -v
```

Only use `-v` when you intentionally want to delete local Postgres and Redis data.

## Service URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API jobs endpoint | `http://localhost:3001/api/v1/jobs` |
| API health endpoint | `http://localhost:3001/api/v1/health` |
| Postgres | `localhost:5432` |
| Redis | `localhost:6379` |

## Run a Manual Scrape

Run all scrapers:

```bash
curl -X POST http://localhost:3001/api/v1/admin/scrape \
  -H "Content-Type: application/json" \
  -d '{}'
```

Run one scraper:

```bash
curl -X POST http://localhost:3001/api/v1/admin/scrape \
  -H "Content-Type: application/json" \
  -d '{"source":"LinkedIn"}'
```

## View Logs

All services:

```bash
docker compose logs -f
```

API only:

```bash
docker compose logs -f api
```

Frontend only:

```bash
docker compose logs -f frontend
```

Postgres only:

```bash
docker compose logs -f postgres
```

Redis only:

```bash
docker compose logs -f redis
```

## Access Postgres

```bash
docker exec -it job-scraper-postgres psql -U jobuser -d jobscraper
```

Useful queries:

```sql
SELECT COUNT(*) FROM "Job";
SELECT id, position, company, source, "createdAt" FROM "Job" LIMIT 5;
```

Prisma uses quoted table names, so use `"Job"` instead of `jobs`.

## Access Redis

```bash
docker exec -it job-scraper-redis redis-cli
```

Then test:

```bash
PING
```

Expected response:

```txt
PONG
```

## Docker Image Notes

### API Image

The API image uses `node:22-bookworm-slim` instead of Alpine because Puppeteer/Chromium is more reliable with Debian-based system packages.

Chromium is installed inside the image and used through:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Frontend Image

The frontend uses a multi-stage Next.js Dockerfile:

1. Install dependencies.
2. Build the Next.js app.
3. Run the production app with `npm start`.

The project does not currently have a `frontend/public` folder, so the Dockerfile should not copy `/app/public`.

## Docker Ignore Files

Keep `.dockerignore` files minimal. The most important entries are:

```dockerignore
node_modules
.next
dist
coverage
.env
.env.*
.git
*.log
.vscode
.idea
.DS_Store
*.tsbuildinfo
```

This keeps Docker build contexts small and prevents local secrets or generated files from being copied into images.

## Troubleshooting

### `role "postgres" does not exist`

Use the configured database user:

```bash
docker exec -it job-scraper-postgres psql -U jobuser -d jobscraper
```

The default Docker database user is `jobuser`, not `postgres`.

### `relation "jobs" does not exist`

Use the Prisma table name:

```sql
SELECT COUNT(*) FROM "Job";
```

not:

```sql
SELECT COUNT(*) FROM jobs;
```

### Frontend build fails on `/app/public`

Your frontend project does not have a `public` directory. Remove this line from `frontend/Dockerfile`:

```dockerfile
COPY --from=build /app/public ./public
```

### API image rebuild is slow

This is mostly caused by Chromium installation. Use normal cached builds:

```bash
docker compose build
```

Avoid using `--no-cache` unless you really need a clean rebuild.

### Redis memory overcommit warning

Redis may print a warning about `vm.overcommit_memory`. For local development, the app can still run. On a production Linux server, enable it with:

```bash
sudo sysctl vm.overcommit_memory=1
```

## Useful Commands

```bash
# Build images
docker compose build

# Start services
docker compose up

# Start services in background
docker compose up -d

# Stop services
docker compose down

# Stop and delete volumes
docker compose down -v

# View logs
docker compose logs -f

# Check running containers
docker compose ps

# Open API shell
docker exec -it job-scraper-api sh

# Open frontend shell
docker exec -it job-scraper-frontend sh

# Open Postgres shell
docker exec -it job-scraper-postgres psql -U jobuser -d jobscraper

# Open Redis shell
docker exec -it job-scraper-redis redis-cli
```