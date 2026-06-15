import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import type { Prisma } from '@prisma/client';
import type { Job, ScraperOptions } from '../scrape';

const DEBUG = process.env.DEBUG === 'true';

export type SkipReason =
  | 'missing_required_field'
  | 'invalid_url'
  | 'description_empty'
  | 'description_too_short'
  | 'description_nav_text'
  | 'description_missing_job_keywords'
  | 'description_bad_scrape'
  | 'enrichment_failed'
  | 'non_us_restricted'
  | 'missing_us_signal';

export interface JobProcessResult {
  found: number;
  enriched: number;
  enrichmentFailed: number;
  avgDescriptionChars: number;
  added: number;
  duplicates: number;
  skipped: number;
  filtered: number;
  descriptionUpdated: number;
  skipReasons: Record<SkipReason, number>;
}

interface JobServiceLike {
  saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{
    added: number;
    duplicates: number;
    skipped: number;
    descriptionUpdated?: number;
  }>;
}

type ValidationResult =
  | { ok: true }
  | { ok: false; reason: SkipReason; detail?: string };

interface DetailExtractionResult {
  success: boolean;
  description: string;
  chars: number;
  reason?: string;
  selector?: string;
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const US_SIGNAL_PATTERNS: RegExp[] = [
  /\bunited\s+states\b/i,
  /\bu\.?s\.?a?\b/i,
  /\bus\s*[-/|,)]?\s*remote\b/i,
  /\bremote\s*[-/|,(]?\s*(us|u\.s\.|usa|united\s+states)\b/i,
  /\bremote\s*[—–-]\s*u\.?s\.?\s*based\b/i,
  /\bu\.?s\.?\s*based\b/i,
  /\b(us|usa|united\s+states)\s*only\b/i,
  /\bauthorized\s+to\s+work\s+in\s+the\s+(us|u\.s\.|united\s+states)\b/i,
  /\bmust\s+be\s+(located|based)\s+in\s+the\s+(us|u\.s\.|united\s+states)\b/i,
  /\bnorth\s+america\b/i,
  /\bnew\s+york|san\s+francisco|los\s+angeles|chicago|seattle|boston|austin|denver|atlanta|miami|dallas|houston|new\s+jersey|washington\s+d\.?c\.?\b/i,
];

const NON_US_RESTRICTED_PATTERNS: RegExp[] = [
  /\[(india|canada|uk|united kingdom|europe|latam|latin america|emea|apac|australia|philippines|pakistan)\]/i,
  /\b(india|canada|uk|united kingdom|europe|latam|latin america|emea|apac|australia|philippines|pakistan)\s+only\b/i,
  /\b(remote|based|located)\s+(in|from)\s+(india|canada|uk|united kingdom|europe|latam|latin america|emea|apac|australia|philippines|pakistan)\b/i,
  /\bapplicants?\s+.*\bmust\s+be\s+from\s+(latin america|latam|canada|india|europe|emea|apac)\b/i,
  /\boutside\s+(the\s+)?(us|u\.s\.|united states)\b/i,
  /\b(non[-\s]?us|non[-\s]?u\.s\.)\s+only\b/i,
  /\b(cdmx|belo horizonte|florian[óo]polis|porto alegre|s[ãa]o paulo|campinas)\b/i,
];

const NAV_START_RE = /^(log in|frontpage|dark mode|general\s+frontpage|join\s+remote\s+ok|join\s+log\s+in|sign up\s+to|create account|forgot password|please\s+(enable|accept)|cookie\s+(policy|notice)|hire remote workers\s+post|learn the skills employers|enhance your skills with courses|sort by latest jobs)/i;

const TITLE_JOB_KEYWORDS_RE = /\b(engineer|developer|designer|manager|analyst|specialist|administrator|assistant|representative|support|product|data|devops|sre|architect|lead|director|intern|consultant|advocate|scientist|editor|writer|recruiter|coordinator|operator)\b/i;
const DESCRIPTION_JOB_KEYWORDS_RE = /role|responsibilit|requirement|qualif|experience|skill|candidate|position|engineer|developer|designer|manager|team|project|work|what you|what we|about the role|must have|you will|we are looking|we're looking|join our|join us|salary|compensation|benefit|remote/i;

const SOURCE_SELECTORS: Record<string, string[]> = {
  'We Work Remotely': [
    '.listing-container',
    '[class*="listing-container"]',
    '.listing',
    'section',
    'main',
    'article',
  ],
  RemoteOK: [
    '[itemprop="description"]',
    '.description',
    '.markdown',
    '.html',
    '.job',
    'main',
    'article',
  ],
  Remotive: ['.job-description', '[class*="job-description"]', '.description', 'main', 'article'],
  'Y Combinator': ['.prose', '[class*="description"]', 'main', 'article'],
  NoDesk: [
    '.job-post-content',
    '.job-content',
    '.job-description',
    '[class*="job-description"]',
    '[class*="job-content"]',
    '[class*="content"]',
    'article',
    'main',
  ],
  'Hubstaff Talent': ['.job-description', '.description', '[class*="description"]', 'main', 'article'],
  SkipTheDrive: ['.entry-content', '.post-content', 'article', 'main'],
  RemoteHub: ['.job-description', '.description', '[class*="description"]', 'main', 'article'],
  LinkedIn: ['.description__text', '.show-more-less-html__markup', '[class*="description"]', 'main'],
};

function emptySkipReasons(): Record<SkipReason, number> {
  return {
    missing_required_field: 0,
    invalid_url: 0,
    description_empty: 0,
    description_too_short: 0,
    description_nav_text: 0,
    description_missing_job_keywords: 0,
    description_bad_scrape: 0,
    enrichment_failed: 0,
    non_us_restricted: 0,
    missing_us_signal: 0,
  };
}

function inc(stats: JobProcessResult, reason: SkipReason): void {
  stats.skipped++;
  stats.skipReasons[reason]++;
}

function removeEmoji(text: string): string {
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

function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanDescription(text: string): string {
  if (!text) return '';

  const noiseLinePatterns: RegExp[] = [
    /^people also viewed$/i,
    /^similar jobs$/i,
    /^you may also like$/i,
    /^related jobs$/i,
    /^recommended jobs$/i,
    /^more jobs like this$/i,
    /^other jobs at .+/i,
    /^jobs at this company$/i,
    /^company profile$/i,
    /^apply now$/i,
    /^apply for this job$/i,
    /^save job$/i,
    /^email this job$/i,
    /^share this job$/i,
    /^report this job$/i,
    /^follow company$/i,
    /^get job alerts$/i,
    /^create (a )?job alert$/i,
    /^sign up.{0,30}job alerts/i,
    /^please let .+ know you found/i,
    /^support us so we can keep/i,
    /^promoted$/i,
    /^sponsored$/i,
    /^advertisement$/i,
    /^about the advertiser$/i,
    /^learn the skills employers are hiring for/i,
    /^enhance your skills with courses/i,
    /^join remote ok/i,
    /^log in general frontpage/i,
    /^privacy policy$/i,
    /^terms of service$/i,
  ];

  const lines = text.split('\n');
  const cutIndex = lines.findIndex(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && noiseLinePatterns.some(re => re.test(trimmed));
  });

  const kept = cutIndex !== -1 ? lines.slice(0, cutIndex) : lines;

  return removeEmoji(kept.join('\n'))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textLooksLikeJobDescription(text: string, title: string): boolean {
  const cleaned = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;

  const hasDescriptionSignal = DESCRIPTION_JOB_KEYWORDS_RE.test(cleaned);
  const hasTitleSignal = TITLE_JOB_KEYWORDS_RE.test(title);

  return hasDescriptionSignal || hasTitleSignal;
}

function isBadScrapedDescription(description: string, company: string): boolean {
  const text = description.toLowerCase().replace(/\s+/g, ' ').trim();
  const companyKey = company.toLowerCase().trim();

  if (!text) return true;
  if (text.includes('sort by latest jobs highest paid')) return true;
  if (text.includes('apply for this job please let')) return true;
  if (text.includes('please let') && text.includes('found this position on')) return true;
  if (text.includes('about fluidstack') && companyKey !== 'fluidstack') return true;
  if (text.includes('remote jobs for digital working nomads') && !text.includes(companyKey)) return true;
  if (text.includes('find the best remote jobs') && !text.includes(companyKey)) return true;
  return false;
}

function validateDescription(description: string, company: string, title = ''): ValidationResult {
  const cleaned = cleanDescription(description);

  if (!cleaned) return { ok: false, reason: 'description_empty' };
  if (cleaned.length < 80) return { ok: false, reason: 'description_too_short', detail: `${cleaned.length} chars` };
  if (NAV_START_RE.test(cleaned)) return { ok: false, reason: 'description_nav_text' };
  if (isBadScrapedDescription(cleaned, company)) return { ok: false, reason: 'description_bad_scrape' };

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 15) return { ok: false, reason: 'description_too_short', detail: `${words.length} words` };
  if (!textLooksLikeJobDescription(cleaned, title)) return { ok: false, reason: 'description_missing_job_keywords' };

  return { ok: true };
}

function validateUSRemote(job: Job): ValidationResult {
  const rawLocation = job.location || '';
  const text = `${job.title}\n${rawLocation}\n${job.description || ''}`;

  if (NON_US_RESTRICTED_PATTERNS.some(re => re.test(text))) {
    return { ok: false, reason: 'non_us_restricted' };
  }

  const stateMatches = rawLocation.match(/\b([A-Z]{2})\b/g);
  const hasUsState = Boolean(stateMatches && stateMatches.some(s => US_STATES.has(s)));

  if (US_SIGNAL_PATTERNS.some(re => re.test(text)) || hasUsState) {
    return { ok: true };
  }

  return { ok: false, reason: 'missing_us_signal' };
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
    normalized === 'remote/us' ||
    normalized === 'fully remote' ||
    normalized === '100% remote' ||
    normalized === 'remote-first' ||
    normalized === 'remote first' ||
    normalized === 'distributed'
  ) {
    return 'remote';
  }

  return normalized || raw;
}

function toPrismaJobType(t: Job['jobType']): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' {
  switch (t) {
    case 'FULL_TIME': return 'FULL_TIME';
    case 'PART_TIME': return 'PART_TIME';
    case 'CONTRACT': return 'CONTRACT';
    case 'INTERNSHIP': return 'INTERNSHIP';
    default: return 'FULL_TIME';
  }
}

function toDbJob(job: Job): Prisma.JobCreateInput {
  let postedAt: Date | undefined;
  try {
    postedAt = job.postedAt ? new Date(job.postedAt) : undefined;
    if (postedAt && isNaN(postedAt.getTime())) postedAt = undefined;
  } catch {
    postedAt = undefined;
  }

  const company = job.company.trim();
  const position = job.title.trim();
  const location = job.location?.trim() || null;

  return {
    position,
    company,
    location,
    salary: job.salary?.trim() || null,
    type: toPrismaJobType(job.jobType),
    url: job.url.trim(),
    source: job.source.trim(),
    description: cleanDescription(job.description),
    companyKey: company.toLowerCase(),
    positionKey: position.toLowerCase(),
    locationKey: normalizeLocationKey(location),
    ...(postedAt ? { postedAt } : {}),
  };
}

class DetailExtractor {
  private browser: Browser | null = null;

  constructor(private config: ScraperOptions = {}) { }

  private async init(): Promise<void> {
    if (this.browser) return;
    this.browser = await puppeteer.launch({
      headless: this.config.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--window-size=1920,1080',
        `--user-agent=${this.config.userAgent ?? DEFAULT_UA}`,
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async createPage(): Promise<Page> {
    await this.init();
    if (!this.browser) throw new Error('Browser did not initialize');

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(this.config.userAgent ?? DEFAULT_UA);

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setRequestInterception(true);
    page.on('request', req => {
      const rt = req.resourceType();
      if (['image', 'media', 'font'].includes(rt)) req.abort();
      else req.continue();
    });

    return page;
  }

  private extractFromJsonLd(html: string): string {
    const $ = cheerio.load(html);
    const blocks = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).text())
      .get();

    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item?.description && typeof item.description === 'string') {
            return item.description;
          }
          if (item?.['@graph'] && Array.isArray(item['@graph'])) {
            const hit = item['@graph'].find((x: any) => typeof x?.description === 'string');
            if (hit?.description) return hit.description;
          }
        }
      } catch {
        // ignore invalid JSON-LD
      }
    }

    return '';
  }

  private extractFromHtmlBySelectors(
    html: string,
    selectors: string[],
    source: string
  ): { html: string; selector: string; score: number } {
    const $ = cheerio.load(html);
    const candidates: Array<{ html: string; text: string; selector: string; score: number }> = [];

    const scoreText = (text: string): number => {
      const t = text.toLowerCase();
      let score = text.length;

      if (/responsibilit|requirement|qualification|you will|about the role|what you/i.test(text)) {
        score += 1500;
      }

      if (/apply now|similar jobs|people also viewed|cookie|privacy policy|log in|sign up/i.test(text)) {
        score -= 3000;
      }

      if (source === 'NoDesk' && /remote jobs for digital working nomads|find the best remote jobs/i.test(t)) {
        score -= 3000;
      }

      if (source === 'RemoteOK' && /join remote ok|remote jobs for digital nomads/i.test(t)) {
        score -= 3000;
      }

      return score;
    };

    const pushCandidate = (el: any, selector: string): void => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text.length < 120) return;

      candidates.push({
        html: $el.html() || '',
        text,
        selector,
        score: scoreText(text),
      });
    };

    for (const sel of selectors) {
      $(sel).each((_, el) => pushCandidate(el, sel));
    }

    $('article, main, section, div').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length >= 300) {
        pushCandidate(el, (el as any).tagName?.toLowerCase?.() || 'container');
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    return best
      ? { html: best.html, selector: best.selector, score: best.score }
      : { html: '', selector: '', score: 0 };
  }

  private async extractOnce(job: Job): Promise<DetailExtractionResult> {
    const selectors = SOURCE_SELECTORS[job.source] || ['article', 'main', '.description', '[class*="description"]'];
    const page = await this.createPage();

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout ?? 60000 });
      await page.waitForNetworkIdle({ idleTime: 700, timeout: 5000 }).catch(() => undefined);
      await new Promise(r => setTimeout(r, 500));

      const html = await page.content();
      const jsonLd = cleanDescription(cleanHtml(this.extractFromJsonLd(html)));
      if (jsonLd.length >= 300 && textLooksLikeJobDescription(jsonLd, job.title)) {
        return { success: true, description: jsonLd, chars: jsonLd.length, selector: 'json-ld' };
      }

      const raw = this.extractFromHtmlBySelectors(html, selectors, job.source);

      const description = cleanDescription(cleanHtml(raw.html));
      if (description.length < 300) {
        return { success: false, description, chars: description.length, reason: 'description_under_300_chars', selector: raw.selector };
      }

      if (!textLooksLikeJobDescription(description, job.title)) {
        return { success: false, description, chars: description.length, reason: 'description_missing_job_signal', selector: raw.selector };
      }

      if (isBadScrapedDescription(description, job.company)) {
        return { success: false, description, chars: description.length, reason: 'bad_scrape_text', selector: raw.selector };
      }

      return { success: true, description, chars: description.length, selector: raw.selector };
    } catch (err: any) {
      return { success: false, description: '', chars: 0, reason: err?.message || String(err) };
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  }

  async extract(job: Job, attempts = 2): Promise<DetailExtractionResult> {
    let last: DetailExtractionResult = { success: false, description: '', chars: 0, reason: 'not_started' };

    for (let i = 0; i < attempts; i++) {
      last = await this.extractOnce(job);
      if (last.success) return last;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 700));
    }

    if (DEBUG) {
      console.warn(chalk.yellow(
        `     ⚠ enrichment failed: ${job.title} @ ${job.company}: ${last.reason || 'unknown'} (${last.chars} chars)`
      ));
    }

    return last;
  }
}

export class JobProcessor {
  constructor(
    private jobService: JobServiceLike,
    private config: ScraperOptions = {}
  ) { }

  private validateBase(job: Job): ValidationResult {
    if (!job.title?.trim() || !job.company?.trim() || !job.url?.trim() || !job.source?.trim()) {
      return { ok: false, reason: 'missing_required_field' };
    }

    try {
      new URL(job.url);
    } catch {
      return { ok: false, reason: 'invalid_url' };
    }

    return { ok: true };
  }

  private async enrichJobs(jobs: Job[], stats: JobProcessResult): Promise<Job[]> {
    if (jobs.length === 0) return jobs;

    const extractor = new DetailExtractor(this.config);
    const output: Job[] = [];
    const concurrency = 3;
    let totalChars = 0;

    console.log(chalk.dim('  ⤷ Processing job details through shared pipeline...'));

    try {
      for (let i = 0; i < jobs.length; i += concurrency) {
        const batch = jobs.slice(i, i + concurrency);
        const enriched = await Promise.all(batch.map(async job => {
          const currentDescription = cleanDescription(job.description || '');
          const currentValidation = validateDescription(currentDescription, job.company, job.title);

          const shouldTryDetail = !currentValidation.ok || currentDescription.length < 700;
          if (!shouldTryDetail) {
            totalChars += currentDescription.length;
            return { ...job, description: currentDescription };
          }

          const detail = await extractor.extract(job);

          if (detail.success && detail.description.length > currentDescription.length) {
            stats.enriched++;
            totalChars += detail.description.length;
            if (DEBUG) {
              console.log(chalk.gray(`     ↳ enriched: ${job.title} @ ${job.company} (${detail.chars} chars via ${detail.selector || 'unknown'})`));
            }
            return { ...job, description: detail.description };
          }

          if (!detail.success) stats.enrichmentFailed++;

          const fallback = currentDescription || detail.description;
          totalChars += fallback.length;
          return { ...job, description: fallback };
        }));

        output.push(...enriched);
      }
    } finally {
      await extractor.close().catch(() => { /* ignore */ });
    }

    stats.avgDescriptionChars = jobs.length ? Math.round(totalChars / jobs.length) : 0;
    console.log(chalk.dim(
      `  ⤷ Shared processing enrichment complete: enriched=${stats.enriched}/${jobs.length} failed=${stats.enrichmentFailed} avgChars=${stats.avgDescriptionChars}`
    ));

    return output;
  }

  async process(jobs: Job[], source: string): Promise<JobProcessResult> {
    const stats: JobProcessResult = {
      found: jobs.length,
      enriched: 0,
      enrichmentFailed: 0,
      avgDescriptionChars: 0,
      added: 0,
      duplicates: 0,
      skipped: 0,
      filtered: 0,
      descriptionUpdated: 0,
      skipReasons: emptySkipReasons(),
    };

    const enrichedJobs = await this.enrichJobs(jobs, stats);
    const dbJobs: Prisma.JobCreateInput[] = [];

    for (const job of enrichedJobs) {
      const base = this.validateBase(job);
      if (!base.ok) {
        inc(stats, base.reason);
        if (DEBUG) console.log(chalk.gray(`   ⏭ ${base.reason}: ${job.title || '(missing title)'} @ ${job.company || '(missing company)'}`));
        continue;
      }

      const desc = validateDescription(job.description || '', job.company, job.title);
      if (!desc.ok) {
        inc(stats, desc.reason);
        if (DEBUG) console.log(chalk.gray(`   ⏭ ${desc.reason}: ${job.title} @ ${job.company}${desc.detail ? ` (${desc.detail})` : ''}`));
        continue;
      }

      const geo = validateUSRemote(job);
      if (!geo.ok) {
        inc(stats, geo.reason);
        stats.filtered++;
        if (DEBUG) console.log(chalk.gray(`   ⏭ ${geo.reason}: ${job.title} @ ${job.company}`));
        continue;
      }

      dbJobs.push(toDbJob(job));
    }

    if (dbJobs.length === 0) {
      console.log(chalk.yellow(`   ⚠️  ${source}: no jobs passed shared processor`));
      return stats;
    }

    const saved = await this.jobService.saveJobs(dbJobs);
    stats.added = saved.added;
    stats.duplicates = saved.duplicates;
    stats.skipped += saved.skipped;
    stats.descriptionUpdated = saved.descriptionUpdated ?? 0;

    return stats;
  }
}