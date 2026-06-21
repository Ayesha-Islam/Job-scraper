import { Container } from '../container';
import { Job, JobFilters, PaginatedResponse, JobStats } from '../types';
import type { Prisma } from '@prisma/client';
import chalk from 'chalk';
import { CacheService } from '../cache';
import { queryJobs, queryJobStats } from '../lib/job.sql';

const DEBUG = process.env.DEBUG === 'true';


function normalizeCompanyKey(company: string): string {
  return company.toLowerCase().trim();
}

function normalizePositionKey(position: string): string {
  return position.toLowerCase().trim();
}

function isLinkedInAuthWall(description: string): boolean {
  const text = description.toLowerCase().replace(/\s+/g, ' ').trim();

  return [
    'join or sign in to find your next job',
    'email or phone',
    'forgot password',
    'sign in with email',
    'new to linkedin',
    'join now',
    'by clicking continue to join or sign in',
    'linkedin user agreement',
    'linkedin privacy policy',
    'linkedin cookie policy',
  ].some(signal => text.includes(signal));
}

function isJammedNavigationShell(text: string): boolean {
  const compact = text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return (
    compact.includes('closehomehomegeneral') ||
    compact.includes('homegeneraljobs') ||
    (compact.includes('generaljobs') && compact.includes('similarjobs'))
  );
}

function isRemoteHubPageWrapper(description: string): boolean {
  const text = description.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    isJammedNavigationShell(description) ||
    (
      /\bsimilar jobs\b|\brelated jobs\b|\brecommended jobs\b/i.test(text) &&
      /\b(home|general|jobs|companies|post a job|sign in|log in|menu|close)\b/i.test(text)
    )
  );
}

function isKnownBadDescription(description: string): boolean {
  return isLinkedInAuthWall(description) || isRemoteHubPageWrapper(description);
}


function normalizeJobDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

    // Preserve common HTML headings as markdown-style heading markers.
    // The UI renders these lines as real headings without injecting HTML.
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(
      /<(p|div)[^>]*>\s*<(strong|b)[^>]*>\s*([\s\S]{2,120}?)\s*<\/\2>\s*<\/\1>/gi,
      (_match, _block, _bold, text) => `\n## ${text}\n\n`
    )
    .replace(
      /<(strong|b)[^>]*>\s*([^<]{2,120}?)\s*(?:<br\s*\/?>\s*){1,}<\/\1>/gi,
      (_match, _tag, text) => `\n## ${text}\n\n`
    )

    // Remove empty/whitespace-only HTML blocks before turning block tags into newlines.
    .replace(/<(p|div|li|h[1-6])[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, '')

    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(p|div|section|article|ul|ol|li)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|section|article|ul|ol|li)>/gi, '\n')
    .replace(/<\/?(a|span|button|mat-icon|mat-chip|small|label|em|i)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    .replace(/[\u00A0\u200B\u200C\u200D\u2028\u2029\uFEFF]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(## .+)\n(?!\n)/gm, '$1\n\n')
    .trim();

  return cleaned || null;
}

function normalizeLocationKey(location: string | null | undefined): string {
  const raw = (location ?? 'remote').toLowerCase().trim();

  const normalized = raw
    .replace(/[🌏🌎🌍🇺🇸]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    normalized === '' ||
    normalized === 'remote' ||
    normalized === 'remote us' ||
    normalized === 'us remote' ||
    normalized === 'remote (us)' ||
    normalized === 'remote - us' ||
    normalized === 'remote - united states' ||
    normalized === 'remote, usa' ||
    normalized === 'remote usa' ||
    normalized === 'remote worldwide' ||
    normalized === 'fully remote' ||
    normalized === '100% remote' ||
    normalized === 'remote-first' ||
    normalized === 'remote first' ||
    normalized === 'distributed' ||
    normalized === 'anywhere' ||
    normalized === 'anywhere in the world' ||
    normalized === 'worldwide' ||
    normalized === 'probably worldwide' ||
    normalized === 'global' ||
    normalized === 'work from anywhere'
  ) {
    return 'remote';
  }

  return normalized || raw;
}


export class JobService {
  constructor(
    private container: Container,
    private cache: CacheService
  ) { }


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

    if (isKnownBadDescription(cleaned)) {
      if (DEBUG) console.log(chalk.gray('     ⚠️  Description looks like authwall/page-wrapper noise'));
      return false;
    }

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

    let cleaned = normalizeJobDescription(description);
    if (!cleaned) return null;

    cleaned = this.removeEmoji(cleaned).trim();
    if (!cleaned) return null;

    cleaned = cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (this.isValidJobDescription(cleaned)) return cleaned;

    if (DEBUG) console.log(chalk.gray(`     ⚠️  Description failed validation after cleaning`));
    return null;
  }


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
      type: job.type,
      url: job.url.trim(),
      source: job.source.trim(),
      description: normalizeJobDescription(job.description as string | null),
      companyKey: normalizeCompanyKey(company),
      positionKey: normalizePositionKey(position),
      locationKey: normalizeLocationKey(location),
      ...(job.postedAt ? { postedAt: job.postedAt } : {}),
    };
  }


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

    const result = await queryJobs(this.container.pool, page, limit, filters);

    await this.cache.set(cacheKey, result, 300);
    return result;
  }


  async getJobById(id: string): Promise<Job | null> {
    const cacheKey = this.cache.generateKey('job', { id });

    const cached = await this.cache.get<Job>(cacheKey);
    if (cached) return cached;

    const job = await this.container.db.job.findUnique({ where: { id } });

    if (job) await this.cache.set(cacheKey, job as Job, 600);

    return job as Job | null;
  }


  async getStats(): Promise<JobStats> {
    const cacheKey = this.cache.generateKey('stats', {});

    const cached = await this.cache.get<JobStats>(cacheKey);
    if (cached) {
      console.log(chalk.gray('   📦 Stats cache hit'));
      return cached;
    }

    console.log(chalk.cyan('   🔄 Calculating fresh stats...'));

    const stats = await queryJobStats(this.container.pool);

    console.log(chalk.green(`   ✅ Stats: ${stats.total} total, ${stats.addedToday} added today`));

    await this.cache.set(cacheKey, stats, 1800);
    return stats;
  }


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

    for (const job of validJobs) {
      try {
        const norm = this.normalizeJobData(job);

        const cleanedDescription = this.cleanDescription(norm.description);
        if (!cleanedDescription) {
          if (DEBUG) console.log(chalk.gray(`   ⏭  No valid description: ${norm.position} @ ${norm.company}`));
          skipped++;
          continue;
        }

        const companyKey = normalizeCompanyKey(norm.company);
        const positionKey = normalizePositionKey(norm.position);
        const locationKey = normalizeLocationKey(norm.location);

        const existing = await this.withDbRetry(() =>
          this.container.db.job.findFirst({
            where: { companyKey, positionKey, locationKey },
            select: {
              id: true,
              description: true,
              postedAt: true,
              url: true,
            },
          })
        );

        if (existing) {
          const existingDescription = this.cleanDescription(
            normalizeJobDescription(existing.description)
          );

          const betterDescription =
            cleanedDescription.length > (existingDescription?.length ?? 0)
              ? cleanedDescription
              : existingDescription;

          if (betterDescription !== existing.description) {
            descriptionUpdated++;
            if (DEBUG) console.log(chalk.blue(`     ↻ Cleaned/better description: ${norm.position}`));
          }

          const incomingPostedAt = norm.postedAt ? new Date(norm.postedAt as string) : null;
          const earlierPostedAt =
            incomingPostedAt && incomingPostedAt < existing.postedAt
              ? incomingPostedAt
              : undefined; // undefined = don't update

          await this.withDbRetry(() =>
            this.container.db.job.update({
              where: { id: existing.id },
              data: {
                url: norm.url,
                source: norm.source,
                salary: norm.salary as string | null,
                type: norm.type,
                isActive: true,
                scrapedAt: new Date(),
                description: betterDescription,
                ...(earlierPostedAt ? { postedAt: earlierPostedAt } : {}),
              },
            })
          );

          duplicates++;
          if (DEBUG) console.log(chalk.gray(`   ↻ Updated: ${norm.position} @ ${norm.company}`));

        } else {
          await this.withDbRetry(() =>
            this.container.db.job.create({
              data: {
                position: norm.position,
                company: norm.company,
                location: norm.location as string | null,
                salary: norm.salary as string | null,
                type: norm.type,
                url: norm.url,
                source: norm.source,
                description: cleanedDescription,
                isActive: true,
                scrapedAt: new Date(),
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

    if (added > 0 || descriptionUpdated > 0) {
      await this.invalidateCaches();
      if (DEBUG) console.log(chalk.gray('   🔄 Job caches invalidated'));
    }

    return { added, duplicates, skipped, descriptionUpdated };
  }


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


  async invalidateCaches(): Promise<void> {
    await Promise.all([
      this.cache.deletePattern('jobs:*'),
      this.cache.deletePattern('job:*'),
      this.cache.deletePattern('stats:*'),
    ]);
  }
}