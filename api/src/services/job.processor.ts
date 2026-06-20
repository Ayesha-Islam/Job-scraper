import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import type { Prisma } from '@prisma/client';
import type { Job, ScraperOptions } from '../scrape';

const TRACE = process.env.TRACE === 'true';
const DEBUG = process.env.DEBUG === 'true' || TRACE;

const LINKEDIN_SOURCE = 'LinkedIn';
const LINKEDIN_MIN_PRESERVE_CHARS = 220;
const LINKEDIN_MIN_REPLACEMENT_CHARS = 300;
const LINKEDIN_MIN_REPLACEMENT_GAIN = 120;

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

export interface SourceQualityMetrics {
  badDescriptions: number;
  missingCompany: number;
  missingLocation: number;
  enrichmentFailures: number;
  warningRate: number;
  rejectionRate: number;
  duplicateRate: number;
}

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
  extractionMethods: Record<string, number>;
  warnings: string[];
  dbErrors: number;
  quality: SourceQualityMetrics;
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
  RemoteHub: [
    '[class*="job-description"]',
    '[class*="job-content"]',
    '[class*="description"]',
    '[class*="vacancy"]',
    '[class*="details"]',
    'article',
    'main',
  ],
  LinkedIn: [
    '.show-more-less-html__markup',
    '.description__text',
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '.jobs-description',
    '.job-details-jobs-unified-top-card__job-description',
    '[data-test-job-description]',
    '[class*="jobs-description"]',
    '[class*="show-more-less-html"]',
    '[class*="job-description"]',
    '[class*="description"]',
    'main',
  ],
};

const NO_GENERIC_DIV_FALLBACK_SOURCES = new Set([
  'NoDesk',
  'Hubstaff Talent',
  'SkipTheDrive'
]);

function shouldUseGenericFallback(source: string): boolean {
  return !NO_GENERIC_DIV_FALLBACK_SOURCES.has(source);
}

function extractionMethodKey(selector?: string): string {
  return selector?.trim() || 'unknown';
}

type SourcePolicy = {
  enrich: boolean;
  concurrency: number;
  maxEnrich: number;
  attempts: number;
  warnWhenDisabled?: boolean;
};

const DEFAULT_SOURCE_POLICY: SourcePolicy = {
  enrich: true,
  concurrency: 2,
  maxEnrich: 25,
  attempts: 1,
};

const SOURCE_POLICIES: Record<string, SourcePolicy> = {
  // RSS/API sources already provide usable descriptions; enrichment would only waste CPU.
  'We Work Remotely': { enrich: false, concurrency: 1, maxEnrich: 50, attempts: 1, warnWhenDisabled: false },
  Remotive: { enrich: false, concurrency: 1, maxEnrich: 50, attempts: 1, warnWhenDisabled: false },

  // Reliable JSON-LD/detail pages.
  RemoteOK: { enrich: true, concurrency: 1, maxEnrich: 50, attempts: 1 },
  'Y Combinator': { enrich: true, concurrency: 2, maxEnrich: 50, attempts: 1 },
  LinkedIn: { enrich: true, concurrency: 1, maxEnrich: 50, attempts: 1 },
  SkipTheDrive: { enrich: true, concurrency: 1, maxEnrich: 50, attempts: 1 },

  // Keep resource usage low on laptop.
  'Hubstaff Talent': { enrich: true, concurrency: 1, maxEnrich: 50, attempts: 1 },
  RemoteHub: { enrich: true, concurrency: 1, maxEnrich: 50, attempts: 1 },

  // NoDesk is intentionally experimental. The listing page has no real descriptions,
  // and detail pages repeatedly return template/bad-scrape text. Keep it out of
  // production runs unless ENABLE_EXPERIMENTAL_SOURCES=true is used in scrape.ts.
  NoDesk: { enrich: false, concurrency: 1, maxEnrich: 0, attempts: 0, warnWhenDisabled: false },
};

function getSourcePolicy(source: string): SourcePolicy {
  return SOURCE_POLICIES[source] ?? DEFAULT_SOURCE_POLICY;
}


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

function calculateQuality(stats: JobProcessResult, missingCompany: number, missingLocation: number): SourceQualityMetrics {
  const badDescriptions =
    stats.skipReasons.description_empty +
    stats.skipReasons.description_too_short +
    stats.skipReasons.description_nav_text +
    stats.skipReasons.description_missing_job_keywords +
    stats.skipReasons.description_bad_scrape;

  const warnings = stats.warnings.length;
  const found = stats.found || 0;
  const rejectionCount = stats.skipped + stats.filtered + stats.duplicates;

  return {
    badDescriptions,
    missingCompany,
    missingLocation,
    enrichmentFailures: stats.enrichmentFailed,
    warningRate: found > 0 ? Number((warnings / found).toFixed(3)) : 0,
    rejectionRate: found > 0 ? Number((rejectionCount / found).toFixed(3)) : 0,
    duplicateRate: found > 0 ? Number((stats.duplicates / found).toFixed(3)) : 0,
  };
}

function removeEmoji(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{2300}-\u{23FF}]/gu, ' ')
    .replace(/[\u{1F004}-\u{1F0CF}]/gu, ' ')
    // Private-use-area glyphs used by icon fonts (Material Icons, FontAwesome, etc.)
    // often leak into innerText scrapes as a single "tofu" character.
    .replace(/[\u{E000}-\u{F8FF}]/gu, ' ')
    .replace(/  +/g, ' ')
    .trim();
}

// Standalone lines that are almost always leftover social-share / nav widgets
// rather than real job content (e.g. a lone "X" from a "Share on X" icon button,
// or "f" / "in" from Facebook / LinkedIn share icons).
const NOISE_STANDALONE_LINE_RE = /^(x|f|in|share|tweet|post|email this|print|copy link|share this job|follow us|share on (x|facebook|linkedin|twitter))$/i;

// Invisible/irregular unicode whitespace that visually creates "blank" lines
// but isn't matched by a plain [ \t] collapse (nbsp, zero-width space, etc.).
function normalizeWhitespace(text: string): string {
  return text.replace(/[\u00A0\u200B\u200C\u200D\u2028\u2029\uFEFF]/g, ' ');
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

export function cleanDescription(text: string): string {
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

  const normalizedText = normalizeWhitespace(text);
  const rawLines = normalizedText.split('\n');

  // Footer/nav sections (e.g. "People also viewed", "Apply now") signal the
  // real job content has ended — cut everything from that point on.
  const cutIndex = rawLines.findIndex(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && noiseLinePatterns.some(re => re.test(trimmed));
  });
  const withinContent = cutIndex !== -1 ? rawLines.slice(0, cutIndex) : rawLines;

  // Drop stray single-line widgets that can appear anywhere in the body
  // (e.g. a lone "X" left behind by a "Share on X" icon button), and trim
  // each line so whitespace-only lines collapse to true empty lines.
  const trimmedLines = withinContent
    .map(line => removeEmoji(line).trim())
    .filter(line => !NOISE_STANDALONE_LINE_RE.test(line));

  // Collapse any run of consecutive blank lines into a single blank line,
  // and drop leading/trailing blank lines.
  const collapsedLines: string[] = [];
  let lastWasBlank = true; // treat the start of the text as if preceded by a blank line
  for (const line of trimmedLines) {
    const isBlank = line.length === 0;
    if (isBlank && lastWasBlank) continue;
    collapsedLines.push(line);
    lastWasBlank = isBlank;
  }
  while (collapsedLines.length > 0 && collapsedLines[collapsedLines.length - 1] === '') {
    collapsedLines.pop();
  }

  return collapsedLines
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Splits an already-cleaned description into paragraphs (blocks separated by
 * a blank line). Each paragraph keeps its internal single line breaks (e.g.
 * bullet lists), but paragraph breaks are normalized to exactly one gap.
 *
 * Use this wherever a description needs to be handed to a renderer as
 * distinct paragraphs (e.g. an API response that the frontend will map
 * straight into <p> tags) instead of one raw blob of text.
 */
export function getDescriptionParagraphs(text: string): string[] {
  const cleaned = cleanDescription(text);
  if (!cleaned) return [];

  return cleaned
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
}

/**
 * Single-line preview for compact contexts (e.g. a job card snippet), with
 * all the same noise removed and line breaks flattened into spaces.
 */
export function getDescriptionPreview(text: string): string {
  return cleanDescription(text).replace(/\n+/g, ' ').replace(/ +/g, ' ').trim();
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

  // Cloudflare / anti-bot / infrastructure pages should never be stored as job descriptions.
  if (/error\s+10\d{2}/i.test(description)) return true;
  if (/ray\s+id|cloudflare|you are being rate limited|access denied|attention required/i.test(description)) return true;
  if (/enable javascript and cookies to continue/i.test(description)) return true;

  // NoDesk sometimes returns a repeated listing/template block instead of the target job.
  if (/remote jobs for digital working nomads|find the best remote jobs/i.test(text) && !text.includes(companyKey)) return true;

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

function isLinkedInSource(source: string): boolean {
  return source.trim().toLowerCase() === LINKEDIN_SOURCE.toLowerCase();
}

function hasUsableDescription(job: Job, description: string, minChars = 80): boolean {
  const cleaned = cleanDescription(description);
  return cleaned.length >= minChars && validateDescription(cleaned, job.company, job.title).ok;
}

function shouldAcceptEnrichedDescription(job: Job, currentDescription: string, enrichedDescription: string): boolean {
  const current = cleanDescription(currentDescription);
  const enriched = cleanDescription(enrichedDescription);

  if (!hasUsableDescription(job, enriched, LINKEDIN_MIN_REPLACEMENT_CHARS)) {
    return false;
  }

  if (!isLinkedInSource(job.source)) {
    return enriched.length > current.length;
  }

  const currentIsUsable = hasUsableDescription(job, current, LINKEDIN_MIN_PRESERVE_CHARS);

  if (!currentIsUsable) {
    return enriched.length >= Math.max(current.length, LINKEDIN_MIN_REPLACEMENT_CHARS);
  }

  // LinkedIn frequently returns truncated, login, or generic pages during enrichment.
  // Only replace a usable LinkedIn description when the new text is clearly better.
  return enriched.length >= current.length + LINKEDIN_MIN_REPLACEMENT_GAIN;
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
      if (['image', 'media', 'font', 'stylesheet'].includes(rt)) req.abort();
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
      if (source === 'LinkedIn' && /join remote ok|remote jobs for digital nomads|find the best remote jobs/i.test(t)) {
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

    if (shouldUseGenericFallback(source)) {
      $('article, main, section, div').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length >= 300) {
          pushCandidate(el, (el as any).tagName?.toLowerCase?.() || 'container');
        }
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    return best
      ? { html: best.html, selector: best.selector, score: best.score }
      : { html: '', selector: '', score: 0 };
  }

  private extractLinkedInFallbackFromHtml(html: string, job: Job): { description: string; selector: string; chars: number } {
    const $ = cheerio.load(html);
    const candidates: Array<{ description: string; selector: string; score: number }> = [];

    const push = (raw: string, selector: string): void => {
      const description = cleanDescription(cleanHtml(raw));
      if (description.length < LINKEDIN_MIN_REPLACEMENT_CHARS) return;
      if (!textLooksLikeJobDescription(description, job.title)) return;
      if (isBadScrapedDescription(description, job.company)) return;

      let score = description.length;
      if (/responsibilit|requirement|qualification|about the role|you will|what you/i.test(description)) {
        score += 1500;
      }
      if (/sign in|join linkedin|people also viewed|similar jobs|jobs you may be interested/i.test(description)) {
        score -= 3000;
      }

      candidates.push({ description, selector, score });
    };

    $('meta[name="description"], meta[property="og:description"]').each((_, el) => {
      push($(el).attr('content') || '', 'linkedin:meta-description');
    });

    $(
      [
        '.show-more-less-html__markup',
        '.jobs-description__content',
        '.jobs-description-content__text',
        '.jobs-box__html-content',
        '[data-test-job-description]',
        '[class*="jobs-description"]',
        '[class*="job-description"]',
      ].join(',')
    ).each((_, el) => {
      push($(el).html() || $(el).text(), 'linkedin:fallback-selector');
    });

    $('script').each((_, el) => {
      const script = $(el).text();
      const matches = script.match(/"description"\s*:\s*"((?:\\.|[^"\\]){300,})"/g) || [];
      for (const match of matches.slice(0, 5)) {
        const rawValue = match.replace(/^"description"\s*:\s*"/, '').replace(/"$/, '');
        try {
          push(JSON.parse(`"${rawValue}"`), 'linkedin:script-description');
        } catch {
          push(rawValue, 'linkedin:script-description');
        }
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    return best
      ? { description: best.description, selector: best.selector, chars: best.description.length }
      : { description: '', selector: 'linkedin:fallback-none', chars: 0 };
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

      let description = cleanDescription(cleanHtml(raw.html));
      let selector = raw.selector;

      if (
        isLinkedInSource(job.source) &&
        (
          description.length < LINKEDIN_MIN_REPLACEMENT_CHARS ||
          !textLooksLikeJobDescription(description, job.title) ||
          isBadScrapedDescription(description, job.company)
        )
      ) {
        const fallback = this.extractLinkedInFallbackFromHtml(html, job);
        if (fallback.description.length > description.length) {
          description = fallback.description;
          selector = fallback.selector;
        }
      }

      if (description.length < LINKEDIN_MIN_REPLACEMENT_CHARS) {
        return { success: false, description, chars: description.length, reason: 'description_under_300_chars', selector };
      }

      if (!textLooksLikeJobDescription(description, job.title)) {
        return { success: false, description, chars: description.length, reason: 'description_missing_job_signal', selector };
      }

      if (isBadScrapedDescription(description, job.company)) {
        return { success: false, description, chars: description.length, reason: 'bad_scrape_text', selector };
      }

      return { success: true, description, chars: description.length, selector };
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

    if (TRACE) {
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

    const source = jobs[0]?.source ?? 'unknown';
    const policy = getSourcePolicy(source);
    const output: Job[] = [];
    let totalChars = 0;
    let attemptedEnrichment = 0;
    let linkedInEnrichmentAttempts = 0;
    let linkedInEnrichmentFails = 0;

    console.log(chalk.dim('  ⤷ Processing job details through shared pipeline...'));

    if (!policy.enrich || policy.maxEnrich <= 0) {
      for (const job of jobs) {
        const currentDescription = cleanDescription(job.description || '');
        totalChars += currentDescription.length;
        output.push({ ...job, description: currentDescription });
      }

      stats.avgDescriptionChars = jobs.length ? Math.round(totalChars / jobs.length) : 0;
      stats.extractionMethods['enrichment:disabled'] = jobs.length;

      if (policy.warnWhenDisabled !== false) {
        stats.warnings.push('enrichment_disabled_by_source_policy');
      }

      console.log(chalk.dim(
        `  ⤷ Shared processing enrichment skipped by source policy: enriched=0/${jobs.length} failed=0 avgChars=${stats.avgDescriptionChars}`
      ));

      return output;
    }

    const extractor = new DetailExtractor(this.config);
    const concurrency = Math.max(1, policy.concurrency);

    try {
      for (let i = 0; i < jobs.length; i += concurrency) {
        const batch = jobs.slice(i, i + concurrency);
        const enriched = await Promise.all(batch.map(async job => {
          const currentDescription = cleanDescription(job.description || '');
          const currentValidation = validateDescription(currentDescription, job.company, job.title);
          const isLinkedIn = isLinkedInSource(job.source);
          const preserveLinkedIn = isLinkedIn && hasUsableDescription(job, currentDescription, LINKEDIN_MIN_PRESERVE_CHARS);

          if (preserveLinkedIn) {
            stats.extractionMethods['linkedin:preserved'] = (stats.extractionMethods['linkedin:preserved'] ?? 0) + 1;
            totalChars += currentDescription.length;
            if (TRACE) {
              console.log(chalk.gray(`     ↳ preserved usable LinkedIn description: ${job.title} @ ${job.company} (${currentDescription.length} chars)`));
            }
            return { ...job, description: currentDescription };
          }

          const shouldTryDetail = !currentValidation.ok || currentDescription.length < 700;
          if (!shouldTryDetail) {
            totalChars += currentDescription.length;
            return { ...job, description: currentDescription };
          }

          if (attemptedEnrichment >= policy.maxEnrich) {
            stats.extractionMethods['enrichment:cap_reached'] = (stats.extractionMethods['enrichment:cap_reached'] ?? 0) + 1;
            totalChars += currentDescription.length;
            return { ...job, description: currentDescription };
          }

          attemptedEnrichment++;
          if (isLinkedIn) linkedInEnrichmentAttempts++;
          const detail = await extractor.extract(job, policy.attempts);

          const method = extractionMethodKey(detail.selector);
          if (detail.success && shouldAcceptEnrichedDescription(job, currentDescription, detail.description)) {
            stats.enriched++;
            stats.extractionMethods[method] = (stats.extractionMethods[method] ?? 0) + 1;
            totalChars += cleanDescription(detail.description).length;
            if (TRACE) {
              console.log(chalk.gray(`     ↳ enriched: ${job.title} @ ${job.company} (${detail.chars} chars via ${method})`));
            }
            return { ...job, description: cleanDescription(detail.description) };
          }

          if (isLinkedIn && (!detail.success || !shouldAcceptEnrichedDescription(job, currentDescription, detail.description))) {
            linkedInEnrichmentFails++;
          }

          if (!detail.success) {
            stats.enrichmentFailed++;
            stats.extractionMethods[`failed:${method}`] = (stats.extractionMethods[`failed:${method}`] ?? 0) + 1;
          }

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

    const attempted = stats.enriched + stats.enrichmentFailed;
    const failRate = attempted > 0 ? stats.enrichmentFailed / attempted : 0;
    const divCount = stats.extractionMethods.div ?? 0;

    if (attemptedEnrichment >= policy.maxEnrich && policy.maxEnrich < jobs.length) {
      stats.warnings.push(`enrichment_capped:${policy.maxEnrich}/${jobs.length}`);
    }
    if (failRate >= 0.5 && attempted >= 5) stats.warnings.push(`high_enrichment_failure_rate:${Math.round(failRate * 100)}%`);
    if (linkedInEnrichmentAttempts > 0) {
      const linkedInFailRate = linkedInEnrichmentFails / linkedInEnrichmentAttempts;
      if (linkedInFailRate >= 0.5) {
        stats.warnings.push(`linkedin_enrichment_unstable:${linkedInEnrichmentFails}/${linkedInEnrichmentAttempts}:${Math.round(linkedInFailRate * 100)}%`);
      }
    }
    if (divCount >= Math.max(10, Math.ceil(jobs.length * 0.5))) stats.warnings.push(`div_extraction_dominant:${divCount}/${jobs.length}`);
    const largeDescriptionThreshold =
      source === 'SkipTheDrive' ? 9000 : 6500;

    if (stats.avgDescriptionChars > largeDescriptionThreshold) {
      stats.warnings.push(`large_avg_description:${stats.avgDescriptionChars}`);
    }
    console.log(chalk.dim(
      `  ⤷ Shared processing enrichment complete: enriched=${stats.enriched}/${attemptedEnrichment} failed=${stats.enrichmentFailed} avgChars=${stats.avgDescriptionChars}`
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
      extractionMethods: {},
      warnings: [],
      dbErrors: 0,
      quality: {
        badDescriptions: 0,
        missingCompany: 0,
        missingLocation: 0,
        enrichmentFailures: 0,
        warningRate: 0,
        rejectionRate: 0,
        duplicateRate: 0,
      },
    };

    const enrichedJobs = await this.enrichJobs(jobs, stats);
    const dbJobs: Prisma.JobCreateInput[] = [];

    let missingCompanyCount = 0;
    let missingLocationCount = 0;

    for (const job of enrichedJobs) {
      if (!job.company?.trim()) missingCompanyCount++;
      if (!job.location?.trim()) missingLocationCount++;

      const base = this.validateBase(job);
      if (base.ok === false) {
        inc(stats, base.reason);
        if (TRACE) console.log(chalk.gray(`   ⏭ ${base.reason}: ${job.title || '(missing title)'} @ ${job.company || '(missing company)'}`));
        continue;
      }

      const desc = validateDescription(job.description || '', job.company, job.title);
      if (desc.ok === false) {
        inc(stats, desc.reason);
        if (TRACE) console.log(chalk.gray(`   ⏭ ${desc.reason}: ${job.title} @ ${job.company}${desc.detail ? ` (${desc.detail})` : ''}`));
        continue;
      }

      const geo = validateUSRemote(job);
      if (geo.ok === false) {
        inc(stats, geo.reason);
        stats.filtered++;
        if (TRACE) console.log(chalk.gray(`   ⏭ ${geo.reason}: ${job.title} @ ${job.company}`));
        continue;
      }

      dbJobs.push(toDbJob(job));
    }

    stats.quality = calculateQuality(stats, missingCompanyCount, missingLocationCount);

    if (dbJobs.length === 0) {
      console.log(chalk.yellow(`   ⚠️  ${source}: no jobs passed shared processor`));
      return stats;
    }

    try {
      const saved = await this.jobService.saveJobs(dbJobs);
      stats.added = saved.added;
      stats.duplicates = saved.duplicates;
      stats.skipped += saved.skipped;
      stats.descriptionUpdated = saved.descriptionUpdated ?? 0;
    } catch (err: any) {
      stats.dbErrors++;
      stats.warnings.push(`db_save_failed:${err?.code || err?.message || 'unknown'}`);
      console.error(chalk.red(`   ✖ DB save failed for ${source}: ${err?.message || err}`));
    }

    return stats;
  }
}