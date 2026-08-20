-- 1) Add nullable columns first so existing rows can be backfilled safely.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "companyKey" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "positionKey" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "locationKey" TEXT;

ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2) Backfill keys using the same normalization rules as job.svc.ts / scrape.ts.
UPDATE "Job"
SET
  "companyKey" = lower(trim(company)),
  "positionKey" = lower(trim(position)),
  "locationKey" = CASE
    WHEN lower(trim(coalesce(location, 'remote'))) IN (
      '',
      'remote',
      'remote us',
      'us remote',
      'remote (us)',
      'remote - us',
      'remote - united states',
      'united states',
      'usa',
      'us',
      'anywhere'
    ) THEN 'remote'
    ELSE lower(trim(coalesce(location, 'remote')))
  END
WHERE "companyKey" IS NULL
   OR "positionKey" IS NULL
   OR "locationKey" IS NULL;

-- 3) Merge duplicate semantic rows before adding the unique constraint.
-- Keeps the oldest created row per semantic key and merges useful fields from duplicate rows.
WITH ranked AS (
  SELECT
    id,
    "companyKey",
    "positionKey",
    "locationKey",
    row_number() OVER (
      PARTITION BY "companyKey", "positionKey", "locationKey"
      ORDER BY "createdAt" ASC, "scrapedAt" DESC
    ) AS rn
  FROM "Job"
), duplicate_groups AS (
  SELECT
    k.id AS keeper_id,
    d.id AS duplicate_id
  FROM ranked d
  JOIN ranked k
    ON d."companyKey" = k."companyKey"
   AND d."positionKey" = k."positionKey"
   AND d."locationKey" = k."locationKey"
   AND k.rn = 1
  WHERE d.rn > 1
), merged AS (
  SELECT
    dg.keeper_id,
    max(j."scrapedAt") AS latest_scraped_at,
    min(j."postedAt") AS earliest_posted_at,
    (array_agg(j.url ORDER BY j."scrapedAt" DESC))[1] AS latest_url,
    (array_agg(j.source ORDER BY j."scrapedAt" DESC))[1] AS latest_source,
    (array_agg(j.salary ORDER BY j."scrapedAt" DESC) FILTER (WHERE j.salary IS NOT NULL))[1] AS latest_salary,
    (array_agg(j.description ORDER BY length(coalesce(j.description, '')) DESC))[1] AS best_description
  FROM duplicate_groups dg
  JOIN "Job" j ON j.id = dg.duplicate_id OR j.id = dg.keeper_id
  GROUP BY dg.keeper_id
)
UPDATE "Job" j
SET
  "scrapedAt" = GREATEST(j."scrapedAt", m.latest_scraped_at),
  "postedAt" = LEAST(j."postedAt", m.earliest_posted_at),
  url = COALESCE(m.latest_url, j.url),
  source = COALESCE(m.latest_source, j.source),
  salary = COALESCE(m.latest_salary, j.salary),
  description = CASE
    WHEN length(coalesce(m.best_description, '')) > length(coalesce(j.description, ''))
      THEN m.best_description
    ELSE j.description
  END,
  "updatedAt" = now()
FROM merged m
WHERE j.id = m.keeper_id;

-- 4) Delete semantic duplicates after merge. CTE scope is per statement, so repeat ranking here.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY "companyKey", "positionKey", "locationKey"
      ORDER BY "createdAt" ASC, "scrapedAt" DESC
    ) AS rn
  FROM "Job"
)
DELETE FROM "Job"
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- 5) Make semantic keys required.
ALTER TABLE "Job" ALTER COLUMN "companyKey" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "positionKey" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "locationKey" SET NOT NULL;

-- 6) Drop old dedup constraints/indexes if they exist.
DROP INDEX IF EXISTS "Job_url_key";
DROP INDEX IF EXISTS "Job_hash_key";
DROP INDEX IF EXISTS "Job_hash_idx";

-- 7) Drop old hash column after old constraints are removed.
ALTER TABLE "Job" DROP COLUMN IF EXISTS hash;

-- 8) Add semantic unique constraint + supporting indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "Job_companyKey_positionKey_locationKey_key"
  ON "Job" ("companyKey", "positionKey", "locationKey");

CREATE INDEX IF NOT EXISTS "Job_companyKey_idx" ON "Job" ("companyKey");
CREATE INDEX IF NOT EXISTS "Job_positionKey_idx" ON "Job" ("positionKey");
CREATE INDEX IF NOT EXISTS "Job_locationKey_idx" ON "Job" ("locationKey");