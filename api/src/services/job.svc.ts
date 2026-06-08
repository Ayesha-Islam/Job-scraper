import { Container } from '../container';
import { Job, JobFilters, PaginatedResponse, JobStats } from '../types';
import type { Prisma } from '@prisma/client';
import chalk from 'chalk';
import { CacheService } from '../cache';
import { queryJobs, queryJobStats } from '../lib/job.sql';

const DEBUG = process.env.DEBUG === 'true';

// ─── Semantic Key Normalization ───────────────────────────────────────────────
// These three functions define the dedup identity.
// MUST stay in sync with migration.sql backfill logic.

function normalizeCompanyKey(company: string): string {
  return company.toLowerCase().trim();
}

function normalizePositionKey(position: string): string {
  return position.toLowerCase().trim();
}

function normalizeLocationKey(location: string | null | undefined): string {
  const raw = (location ?? 'remote').toLowerCase().trim();

  // Collapse common remote variants to a single canonical value
  if (
    raw === '' ||
    raw === 'remote' ||
    raw === 'remote us' ||
    raw === 'us remote' ||
    raw === 'remote (us)' ||
    raw === 'remote - us' ||
    raw === 'remote - united states' ||
    raw === 'united states' ||
    raw === 'usa' ||
    raw === 'us' ||
    raw === 'anywhere'
  ) {
    return 'remote';
  }

  return raw;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class JobService {
  constructor(
    private container: Container,
    private cache: CacheService
  ) {}

  // ─── DB Retry Utility ──────────────────────────────────────────────────────

  private async withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        const isConnErr =
          err?.message?.includes('Failed to connect') ||
          err?.message?.includes('connection') ||
          err?.message?.includes('ECONNRESET') ||
          err?.message?.includes('ETIMEDOUT');

        if (isConnErr && i < retries - 1) {
          const wait = 2000 * (i + 1);
          console.warn(chalk.yellow(
            `   ⚠️  DB connection lost — reconnecting in ${wait / 1000}s (attempt ${i + 1}/${retries - 1})...`
          ));
          await new Promise(r => setTimeout(r, wait));
          try { await this.container.db.$connect(); } catch { /* ignore */ }
          continue;
        }
        throw err;
      }
    }
    throw new Error('DB retries exhausted');
  }

  // ─── Description Validation / Cleaning ────────────────────────────────────

  private removeEmoji(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ')
      .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/[\u{2300}-\u{23FF}]/gu, ' ')
      .replace(/[\u{1F004}-\u{1F0CF}]/gu, ' ')
      .replace(/  +/g, ' ')
      .trim();
  }

  private isValidJobDescription(description: string | null | undefined): boolean {
    if (!description) return false;

    const cleaned = this.removeEmoji(description).trim();

    if (cleaned.length < 80) {
      if (DEBUG) console.log(chalk.gray(`     ⚠️  Description too short (${cleaned.length} chars)`));
      return false;
    }

    const pureNavStart = /^(log in|frontpage|dark mode|general\s+frontpage|join\s+remote\s+ok|join\s+log\s+in|sign up\s+to|create account|forgot password|please\s+(enable|accept)|cookie\s+(policy|notice)|hire remote workers\s+post|learn the skills employers|enhance your skills with courses)/i;
    if (pureNavStart.test(cleaned)) {
      if (DEBUG) console.log(chalk.gray(`     ⚠️  Description looks like metadata/nav`));
      return false;
    }

    const jobKeywords = /role|responsibilit|requirement|qualif|experience|skill|candidate|position|engineer|developer|designer|manager|team|project|work|what you|what we|about the role|must have|you will|we are looking|we're looking|join our|join us|salary|compensation|benefit|remote/i;
    if (!jobKeywords.test(cleaned)) {
      if (DEBUG) console.log(chalk.gray(`     ⚠️  No job keywords found`));
      return false;
    }

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 20) {
      if (DEBUG) console.log(chalk.gray(`     ⚠️  Not enough words (${words.length})`));
      return false;
    }

    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    if (avgWordLength < 3) {
      if (DEBUG) console.log(chalk.gray(`     ⚠️  Average word length too short (${avgWordLength.toFixed(1)})`));
      return false;
    }

    return true;
  }

  private cleanDescription(description: string | null | undefined): string | null {
    if (!description) return null;

    let cleaned = this.removeEmoji(description).trim();
    if (!cleaned) return null;

    cleaned = cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (this.isValidJobDescription(cleaned)) return cleaned;

    if (DEBUG) console.log(chalk.gray(`     ⚠️  Description failed validation after cleaning`));
    return null;
  }

  // ─── Job Data Validation ──────────────────────────────────────────────────

  private validateJobData(job: Prisma.JobCreateInput): boolean {
    if (!job.position || typeof job.position !== 'string' || job.position.trim() === '') {
      if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping: missing position`));
      return false;
    }
    if (!job.company || typeof job.company !== 'string' || job.company.trim() === '') {
      if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping: missing company for "${job.position}"`));
      return false;
    }
    if (!job.url || typeof job.url !== 'string' || job.url.trim() === '') {
      if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping: missing URL for "${job.position}"`));
      return false;
    }
    if (!job.source || typeof job.source !== 'string' || job.source.trim() === '') {
      if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping: missing source for "${job.position}"`));
      return false;
    }
    if (!job.type || typeof job.type !== 'string') {
      if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping: missing type for "${job.position}"`));
      return false;
    }

    const invalidPositions = [
      'view company profile', 'view profile', 'apply now', 'learn more',
      'see more', 'view job', 'view details', 'company profile',
      'read more', 'more info', 'click here',
    ];
    if (invalidPositions.includes(job.position.toLowerCase().trim())) {
      console.log(chalk.yellow(`   ⚠️  Skipping invalid position: "${job.position}"`));
      return false;
    }
    if (job.position.trim().length < 3) {
      console.log(chalk.yellow(`   ⚠️  Skipping short position: "${job.position}"`));
      return false;
    }
    if (job.position.includes('<') || job.position.includes('>')) {
      console.log(chalk.yellow(`   ⚠️  Skipping position with HTML: "${job.position}"`));
      return false;
    }
    if (job.company.includes('<') || job.company.includes('>')) {
      console.log(chalk.yellow(`   ⚠️  Skipping company with HTML: "${job.company}"`));
      return false;
    }
    try {
      new URL(job.url);
    } catch {
      console.log(chalk.yellow(`   ⚠️  Skipping invalid URL: "${job.url}"`));
      return false;
    }

    return true;
  }

  // ─── Job Data Normalization ────────────────────────────────────────────────

  private normalizeJobData(job: Prisma.JobCreateInput): Prisma.JobCreateInput {
    const position = job.position.trim();
    const company = job.company.trim();
    const location = job.location?.trim() || null;

    return {
      position,
      company,
      location,
      salary: (() => {
        const s = (job.salary as string | null)?.trim();
        return (s && /[\d$\u20ac\u00a3\u00a5\u20b9]/.test(s)) ? s : null;
      })(),
      type:        job.type,
      url:         job.url.trim(),
      source:      job.source.trim(),
      description: (job.description as string | null)?.trim() || null,
      companyKey:  normalizeCompanyKey(company),
      positionKey: normalizePositionKey(position),
      locationKey: normalizeLocationKey(location),
      ...(job.postedAt ? { postedAt: job.postedAt } : {}),
    };
  }

  // ─── READ: Search / Filter / Paginate ─────────────────────────────────────
  // Delegates to raw SQL layer — DO NOT use Prisma here

  async getJobs(
    page: number = 1,
    limit: number = 20,
    filters: JobFilters = {}
  ): Promise<PaginatedResponse<Job>> {
    const cacheKey = this.cache.generateKey('jobs', { page, limit, ...filters });

    const cached = await this.cache.get<PaginatedResponse<Job>>(cacheKey);
    if (cached) {
      console.log(chalk.gray('   📦 Cache hit'));
      return cached;
    }

    // → raw SQL (search + filter + sort + pagination)
    const result = await queryJobs(this.container.pool, page, limit, filters);

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  // ─── READ: Single Job ──────────────────────────────────────────────────────
  // Simple PK lookup — Prisma is correct here

  async getJobById(id: string): Promise<Job | null> {
    const cacheKey = this.cache.generateKey('job', { id });

    const cached = await this.cache.get<Job>(cacheKey);
    if (cached) return cached;

    // → Prisma (simple single-row PK lookup)
    const job = await this.container.db.job.findUnique({ where: { id } });

    if (job) await this.cache.set(cacheKey, job as Job, 600);

    return job as Job | null;
  }

  // ─── READ: Stats / Analytics ───────────────────────────────────────────────
  // Aggregation queries — MUST use raw SQL

  async getStats(): Promise<JobStats> {
    const cacheKey = this.cache.generateKey('stats', {});

    const cached = await this.cache.get<JobStats>(cacheKey);
    if (cached) {
      console.log(chalk.gray('   📦 Stats cache hit'));
      return cached;
    }

    console.log(chalk.cyan('   🔄 Calculating fresh stats...'));

    // → raw SQL (analytics aggregations)
    const stats = await queryJobStats(this.container.pool);

    console.log(chalk.green(`   ✅ Stats: ${stats.total} total, ${stats.addedToday} added today`));

    await this.cache.set(cacheKey, stats, 1800);
    return stats;
  }

  // ─── WRITE: Save Scraped Jobs ──────────────────────────────────────────────
  //
  // Dedup logic — Option D (semantic key):
  //
  //   1. Compute companyKey + positionKey + locationKey from the incoming job
  //   2. findFirst by composite key — if found → UPDATE, if not → INSERT
  //   3. No hash. No url unique check. No P2002 possible.
  //
  // Update policy when a duplicate is found:
  //   - Always update: url, source, salary, type, scrapedAt, isActive
  //   - Update description ONLY if incoming is better (longer, not null)
  //   - Update postedAt ONLY if incoming is earlier (preserve first-seen date)
  //   - Never overwrite: companyKey, positionKey, locationKey (dedup keys),
  //     createdAt, id

  async saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{
    added: number;
    duplicates: number;
    skipped: number;
    descriptionUpdated: number;
  }> {
    let added = 0;
    let duplicates = 0;
    let skipped = 0;
    let descriptionUpdated = 0;

    // ── Phase 1: validate ────────────────────────────────────────────────────
    const validJobs = jobs.filter(job => {
      const isValid = this.validateJobData(job);
      if (!isValid) skipped++;
      return isValid;
    });

    if (validJobs.length === 0) {
      console.log(chalk.yellow('   ⚠️  No valid jobs to save after filtering'));
      return { added: 0, duplicates: 0, skipped, descriptionUpdated: 0 };
    }

    console.log(chalk.cyan(`   📝 Saving ${validJobs.length} validated jobs (${skipped} skipped)...`));

    // ── Phase 2: persist ─────────────────────────────────────────────────────
    for (const job of validJobs) {
      try {
        // Normalize display values
        const norm = this.normalizeJobData(job);

        // Clean description — skip job entirely if description is unusable
        const cleanedDescription = this.cleanDescription(norm.description);
        if (!cleanedDescription) {
          if (DEBUG) console.log(chalk.gray(`   ⏭  No valid description: ${norm.position} @ ${norm.company}`));
          skipped++;
          continue;
        }

        // Compute the three semantic keys — these are the dedup authority
        const companyKey  = normalizeCompanyKey(norm.company);
        const positionKey = normalizePositionKey(norm.position);
        const locationKey = normalizeLocationKey(norm.location);

        // ── Dedup lookup: one query, one authority ──────────────────────────
        const existing = await this.withDbRetry(() =>
          this.container.db.job.findFirst({
            where:  { companyKey, positionKey, locationKey },
            select: {
              id:          true,
              description: true,
              postedAt:    true,
              url:         true,
            },
          })
        );

        if (existing) {
          // ── UPDATE branch ─────────────────────────────────────────────────
          //
          // Description update policy:
          //   Keep whichever description is longer (more complete).
          //   Never replace a good description with a shorter one.
          const betterDescription =
            cleanedDescription.length > (existing.description?.length ?? 0)
              ? cleanedDescription
              : existing.description;

          if (betterDescription !== existing.description) {
            descriptionUpdated++;
            if (DEBUG) console.log(chalk.blue(`     ↻ Better description: ${norm.position}`));
          }

          // postedAt update policy:
          //   Keep the earliest date we've ever seen for this job.
          const incomingPostedAt = norm.postedAt ? new Date(norm.postedAt as string) : null;
          const earlierPostedAt =
            incomingPostedAt && incomingPostedAt < existing.postedAt
              ? incomingPostedAt
              : undefined; // undefined = don't update

          await this.withDbRetry(() =>
            this.container.db.job.update({
              where: { id: existing.id },
              data: {
                // Always refresh these on every scrape
                url:         norm.url,
                source:      norm.source,
                salary:      norm.salary as string | null,
                type:        norm.type,
                isActive:    true,
                scrapedAt:   new Date(),
                // Conditional updates
                description: betterDescription,
                ...(earlierPostedAt ? { postedAt: earlierPostedAt } : {}),
              },
            })
          );

          duplicates++;
          if (DEBUG) console.log(chalk.gray(`   ↻ Updated: ${norm.position} @ ${norm.company}`));

        } else {
          // ── INSERT branch ─────────────────────────────────────────────────
          await this.withDbRetry(() =>
            this.container.db.job.create({
              data: {
                position:    norm.position,
                company:     norm.company,
                location:    norm.location as string | null,
                salary:      norm.salary as string | null,
                type:        norm.type,
                url:         norm.url,
                source:      norm.source,
                description: cleanedDescription,
                isActive:    true,
                scrapedAt:   new Date(),
                // Semantic key columns
                companyKey,
                positionKey,
                locationKey,
                ...(norm.postedAt ? { postedAt: new Date(norm.postedAt as string) } : {}),
              },
            })
          );

          added++;
          if (DEBUG) console.log(chalk.green(`   ✓ Added: ${norm.position} @ ${norm.company}`));
        }

      } catch (error: any) {
        // P2002 should no longer happen with Option D.
        // If it does, it means two jobs in the SAME batch share the same
        // semantic key (same company+position+location scraped twice in one run).
        // That's a valid dedup — log it clearly instead of silently skipping.
        if (error?.code === 'P2002') {
          if (DEBUG) console.log(chalk.gray(
            `   ⟳ Intra-batch duplicate (same semantic key): ${job.position} @ ${job.company}`
          ));
          duplicates++;
        } else {
          console.error(chalk.red(`   ❌ Error saving job: ${job.position} @ ${job.company}`));
          if (DEBUG) console.error(error);
          skipped++;
        }
      }
    }

    // Invalidate stats cache if new jobs were added
    if (added > 0 || descriptionUpdated > 0) {
      await this.cache.deletePattern('stats:*');
      if (DEBUG) console.log(chalk.gray('   🔄 Stats cache invalidated'));
    }

    return { added, duplicates, skipped, descriptionUpdated };
  }

  // ─── WRITE: Cleanup Bad Descriptions ──────────────────────────────────────
  // Two SQL queries replace the original N+1 Prisma pattern.
  // Step 1: find bad IDs inside Postgres (nothing loaded into Node memory)
  // Step 2: clear all in one UPDATE with ANY($1)

  async cleanupBadDescriptions(): Promise<{ updated: number; cleared: number }> {
    console.log(chalk.cyan('\n   🧹 Cleaning up bad descriptions...\n'));

    const findBadSql = `
      SELECT id, position, LEFT(description, 60) AS preview
      FROM   "Job"
      WHERE  "isActive" = true
        AND  description IS NOT NULL
        AND  description <> ''
        AND (
          LENGTH(TRIM(description)) < 80
          OR TRIM(description) ~* '^(log in|frontpage|dark mode|general\\s+frontpage|join\\s+remote\\s+ok|join\\s+log\\s+in|sign up\\s+to|create account|forgot password|please\\s+(enable|accept)|cookie\\s+(policy|notice)|hire remote workers\\s+post|learn the skills employers|enhance your skills with courses)'
          OR NOT (description ~* 'role|responsibilit|requirement|qualif|experience|skill|candidate|position|engineer|developer|designer|manager|team|project|work|what you|what we|about the role|must have|you will|we are looking|join our|join us|salary|compensation|benefit|remote')
        )
    `;

    const badRows = await this.container.pool.query<{
      id: string;
      position: string;
      preview: string;
    }>(findBadSql);

    if (badRows.rows.length === 0) {
      console.log(chalk.green('   ✅ No bad descriptions found\n'));
      return { updated: 0, cleared: 0 };
    }

    for (const row of badRows.rows) {
      console.log(chalk.gray(`     ✗ Clearing: ${row.position} (${row.preview}...)`));
    }

    const badIds = badRows.rows.map(r => r.id);

    await this.container.pool.query(
      `UPDATE "Job" SET description = NULL WHERE id = ANY($1)`,
      [badIds]
    );

    const cleared = badRows.rows.length;
    console.log(chalk.green(`\n   ✅ Cleanup complete: ${cleared} descriptions cleared\n`));

    return { updated: 0, cleared };
  }

  // ─── Cache Utilities ───────────────────────────────────────────────────────

  async invalidateCaches(): Promise<void> {
    await Promise.all([
      this.cache.deletePattern('jobs:*'),
      this.cache.deletePattern('job:*'),
      this.cache.deletePattern('stats:*'),
    ]);
  }
}