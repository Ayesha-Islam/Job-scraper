# Adding a provider

A provider adapter should do one job: translate one external source into the
shared job shape. Global validation, description policy, and deduplication belong
to the processor.

## Before writing code

Confirm that automated access is permitted. Review the provider's terms,
robots policy, authentication boundaries, and expected request volume. Prefer a
documented API or static HTTP parsing over browser automation when both are
available.

Do not add a source whose reliable operation requires bypassing access controls,
CAPTCHAs, or rate limits.

## 1. Study the current boundary

Provider classes and orchestration currently live in `api/src/scrape.ts`.
Existing adapters demonstrate both Cheerio-based HTTP extraction and Puppeteer
browser extraction. Reuse the common job and result types rather than defining a
parallel output shape.

A useful adapter returns:

- company;
- position;
- location;
- job type where available;
- canonical application URL;
- source name;
- best listing description available;
- posting time where the source provides it.

The processor will validate and normalize these values.

## 2. Implement the smallest extractor

Add a provider class in `api/src/scrape.ts` that follows the existing scraper
contract. Keep selectors and pagination rules inside the class. Apply bounded
timeouts and collect extraction errors in the scraper result instead of hiding
them.

Prefer:

1. a stable JSON or public API response;
2. server-rendered HTML with Cheerio;
3. Puppeteer only when the content genuinely requires a browser.

Always release browser pages and other resources in `finally` paths.

## 3. Register the provider

Add one `ScrapeJobConfig` entry in
`ScraperManager.getScrapeJobs()`:

```ts
{
  source: 'Provider name',
  scraper: new ProviderScraper(this.config),
  query: 'developer',
  pages: 1,
}
```

The `source` string becomes an operator-facing identifier and must remain stable.
`runOne()` accepts normalized display names or scraper class names.

If the source is not yet reliable, place registration behind an explicit
environment flag following the `ENABLE_EXPERIMENTAL_SOURCES` pattern.

## 4. Define source-aware processing

Review the source policies in `api/src/services/job.processor.ts`. Add a policy
only if this provider differs from the safe defaults:

- whether detail-page enrichment is appropriate;
- which description wrappers are known noise;
- whether listing text is usually complete;
- what should count as an enrichment failure.

Do not put a provider-specific selector in the generic deduplication code.

## 5. Add fixtures and tests

At minimum, test:

- a normal listing;
- missing required fields;
- an empty result page;
- changed or missing selectors;
- pagination termination;
- timeout or request failure;
- resource cleanup;
- processing and persistence of the returned job;
- description fallback if enrichment fails.

Fixtures should remove personal data and should be small enough to reveal which
markup the extractor depends on.

## 6. Run a controlled smoke test

Use one page and a conservative request rate. Confirm:

- jobs found, accepted, skipped, and added are plausible;
- application URLs lead to the intended role;
- descriptions contain job content rather than navigation or login text;
- a second run produces duplicates or updates rather than new copies;
- the provider failure does not stop other providers.

The CLI currently executes all enabled providers. For a focused run, use the
protected admin endpoint with a `source` value or add a focused automated test;
do not temporarily delete other registrations.

## 7. Document the boundary

Update:

- the configured-source count if it appears in user-facing docs;
- `api/.env.example` and [Configuration](../reference/configuration.md) for a new
  flag or credential;
- [Ingestion and data quality](../architecture/ingestion-and-data-quality.md) if
  the provider requires a new system-wide rule.

Do not document a source as supported until its extraction, processing, and
second-run deduplication have been verified.
