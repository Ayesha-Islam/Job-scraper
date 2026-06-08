import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import { createHash } from 'crypto';
import https from 'https';
import type { Prisma } from '@prisma/client';
import { CacheService } from './cache';
import { JobService } from './services/job.svc';
import { db } from './lib/prisma';
import container from './container';

function httpsGet(url: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`httpsGet timeout: ${url}`)); });
    req.on('error', reject);
  });
}

export type ScraperJobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE' | 'UNKNOWN';
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE' | 'UNKNOWN';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote: boolean;
  timezone?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType: ScraperJobType;
  experienceLevel: ExperienceLevel;
  categories: string[];
  description: string;
  requirements: string[];
  responsibilities: string[];
  techStack: string[];
  benefits: string[];
  url: string;
  source: string;
  postedAt: string;
  scrapedAt: string;
  isActive: boolean;
}

export interface ScraperOptions {
  headless?: boolean;
  delay?: number;
  timeout?: number;
  userAgent?: string;
  maxRetries?: number;
  outputDir?: string;
}

export interface ScraperResult {
  source: string;
  jobs: Job[];
  scrapedAt: string;
  durationMs: number;
  errors: string[];
  filtered: number;
}

export interface ScrapeRunResult {
  source: string;
  jobsFound: number;
  jobsAdded: number;
  jobsDuplicate: number;
  jobsFiltered: number;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  duration: number;
}

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const NON_US_COUNTRIES = [
  'united kingdom', ' uk ', 'england', 'london', 'scotland', 'wales',
  'ireland', 'dublin', 'cork',
  'canada', 'toronto', 'vancouver', 'montreal', 'ontario', 'alberta',
  'british columbia', 'quebec', 'calgary', 'ottawa',
  'australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
  'new zealand', 'auckland',
  'india', 'bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'delhi', 'pune', 'chennai',
  'germany', 'france', 'netherlands', 'spain', 'italy', 'poland',
  'ukraine', 'romania', 'sweden', 'norway', 'denmark', 'finland',
  'switzerland', 'austria', 'belgium', 'portugal', 'czech republic',
  'hungary', 'greece', 'croatia', 'serbia', 'bulgaria', 'slovakia',
  'slovenia', 'estonia', 'latvia', 'lithuania', 'luxembourg',
  'berlin', 'munich', 'frankfurt', 'hamburg', 'paris', 'lyon', 'marseille',
  'amsterdam', 'rotterdam', 'madrid', 'barcelona', 'rome', 'milan',
  'warsaw', 'krakow', 'kyiv', 'kharkiv', 'bucharest', 'stockholm',
  'oslo', 'copenhagen', 'helsinki', 'zurich', 'geneva', 'vienna',
  'brussels', 'lisbon', 'prague', 'budapest',
  'brazil', 'são paulo', 'sao paulo', 'rio de janeiro',
  'mexico city', 'ciudad de mexico', 'guadalajara', 'monterrey',
  'argentina', 'buenos aires', 'colombia', 'bogota', 'chile', 'santiago',
  'peru', 'lima', 'venezuela', 'caracas',
  'singapore', 'hong kong', 'japan', 'tokyo', 'osaka',
  'china', 'beijing', 'shanghai', 'shenzhen',
  'south korea', 'seoul', 'taiwan', 'taipei',
  'indonesia', 'jakarta', 'malaysia', 'kuala lumpur', 'thailand', 'bangkok',
  'vietnam', 'philippines', 'manila', 'pakistan', 'karachi', 'lahore',
  'bangladesh', 'dhaka', 'sri lanka',
  'israel', 'tel aviv', 'dubai', 'uae', 'abu dhabi', 'saudi arabia',
  'riyadh', 'qatar', 'doha', 'turkey', 'istanbul', 'ankara',
  'south africa', 'johannesburg', 'cape town', 'nigeria', 'lagos',
  'kenya', 'nairobi', 'egypt', 'cairo', 'ghana', 'accra', 'ethiopia',
  'europe', 'africa', 'asia', 'oceania', 'latin america', 'south america',
  'emea', 'apac', 'non-us', 'non us',
  'eu only', 'europe only', 'emea only', 'outside us', 'non-us only',
];

const REMOTE_KEYWORDS = [
  'remote', 'anywhere', 'worldwide', 'distributed', 'work from home',
  'wfh', 'fully remote', '100% remote', 'remote-first', 'remote first',
  'remote us', 'us remote', 'united states', 'usa only', 'us only',
  'usa', 'u.s.a', 'u.s.', 'north america', 'united states only',
  'usa & canada', 'usa/canada', 'america',
];

export function isUSOrRemoteJob(location: string, description = ''): boolean {
  const loc = location.toLowerCase().trim();
  const combined = `${loc} ${description.toLowerCase()}`;

  if (REMOTE_KEYWORDS.some(kw => combined.includes(kw))) return true;

  const stateMatches = location.match(/\b([A-Z]{2})\b/g);
  if (stateMatches && stateMatches.some(s => US_STATES.has(s))) return true;

  if (/\b(united states|usa|u\.s\.|new york|san francisco|los angeles|chicago|seattle|boston|austin|denver|atlanta|miami|dallas|houston|new jersey|washington dc|washington d\.c)\b/.test(loc)) {
    return true;
  }

  if (NON_US_COUNTRIES.some(c => {
    if (c.length <= 3) return new RegExp(`\\b${c}\\b`, 'i').test(loc);
    return loc.includes(c);
  })) return false;

  return true;
}

export function cleanHtml(raw: string): string {
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

  const NOISE_LINE_PATTERNS: RegExp[] = [
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
    /^\s*cookie\s*(policy|notice|consent)\s*$/i,
    /^privacy policy$/i,
  ];

  const lines = text.split('\n');
  const cutIndex = lines.findIndex(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && NOISE_LINE_PATTERNS.some(re => re.test(trimmed));
  });

  const kept = cutIndex !== -1 ? lines.slice(0, cutIndex) : lines;
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isLikelyRealDescription(text: string): boolean {
  if (!text || text.trim().length < 80) return false;
  if (/^(join remote ok|log in general frontpage|learn the skills employers|enhance your skills with courses|frontpage|dark mode|hire remote workers)/i.test(text.trim())) return false;
  return /role|responsibilit|requirement|qualif|experience|engineer|developer|designer|manager|team|we (are|offer|look)|you will|what you/i.test(text);
}

function inferJobType(text: string): ScraperJobType {
  const t = text.toLowerCase();
  if (/\bfull[\s-]?time\b/.test(t)) return 'FULL_TIME';
  if (/\bpart[\s-]?time\b/.test(t)) return 'PART_TIME';
  if (/\bfreelance\b/.test(t)) return 'FREELANCE';
  if (/\bcontract\b/.test(t)) return 'CONTRACT';
  if (/\bintern(ship)?\b/.test(t)) return 'INTERNSHIP';
  return 'UNKNOWN';
}

function inferExperienceLevel(title: string, description: string): ExperienceLevel {
  const t = `${title} ${description}`.toLowerCase();
  if (/\b(vp|vice president|chief|cto|ceo|head of)\b/.test(t)) return 'EXECUTIVE';
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return 'LEAD';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'SENIOR';
  if (/\b(mid|intermediate|ii)\b/.test(t)) return 'MID';
  if (/\b(junior|jr\.?|entry[\s-]?level|new grad|graduate)\b/.test(t)) return 'JUNIOR';
  return 'UNKNOWN';
}

export function extractTechStack(text: string): string[] {
  const TECH = [
    'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
    'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI',
    'Spring', 'Laravel', 'Rails', 'Ruby on Rails',
    'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java',
    'Kotlin', 'Swift', 'C#', 'C\\+\\+', 'PHP', 'Scala', 'Elixir',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'GraphQL', 'REST', 'gRPC',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
    'GitHub', 'GitLab', 'CI/CD',
    'Machine Learning', 'TensorFlow', 'PyTorch', 'LLM', 'OpenAI',
    'Figma', 'Tailwind', 'SASS',
  ];
  const found = new Set<string>();
  for (const kw of TECH) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) found.add(kw.replace(/\\\+/g, '+'));
  }
  return Array.from(found);
}

export function extractBulletSection(text: string, headings: string[]): string[] {
  const pattern = headings.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:${pattern})[:\\s]*\\n((?:[\\s\\S]*?))(?:\\n\\n|\\n\\s*[A-Z][A-Za-z\\s]+:|$)`, 'i');
  const match = regex.exec(text);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(l => l.replace(/^[-•*◦▸►·]\s*/, '').trim())
    .filter(l => l.length > 10);
}

function extractBenefits(text: string): string[] {
  return extractBulletSection(text, ['Benefits', 'Perks', 'What we offer', 'We offer', 'Compensation & Benefits']);
}

function parseSalaryRange(salary: string): { min?: number; max?: number } {
  if (!salary) return {};
  const nums = salary.match(/[\d,]+(?:\.\d+)?k?/gi);
  if (!nums || nums.length === 0) return {};
  const parse = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ''));
    return s.toLowerCase().includes('k') ? n * 1000 : n;
  };
  if (nums.length === 1) return { min: parse(nums[0]), max: parse(nums[0]) };
  return { min: parse(nums[0]), max: parse(nums[1]) };
}

function cleanSalary(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
  if (!/[\d$\u20ac\u00a3\u00a5\u20b9]/.test(cleaned)) return '';
  return cleaned;
}

function makeJobId(url: string, title: string, company: string): string {
  const str = `${url}|${title}|${company}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

export function standardizePostedDate(raw: string | undefined, fallback: Date = new Date()): string {
  if (!raw || raw.trim() === '') return fallback.toISOString();
  if (!isNaN(Date.parse(raw))) return new Date(raw).toISOString();

  const lower = raw.toLowerCase().trim();
  if (lower === 'new' || lower === 'today') return fallback.toISOString();
  if (lower === 'yesterday') {
    const d = new Date(fallback); d.setDate(d.getDate() - 1); return d.toISOString();
  }
  const ago = lower.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
  if (ago) {
    const v = parseInt(ago[1], 10);
    const d = new Date(fallback);
    switch (ago[2]) {
      case 'second': d.setSeconds(d.getSeconds() - v); break;
      case 'minute': d.setMinutes(d.getMinutes() - v); break;
      case 'hour': d.setHours(d.getHours() - v); break;
      case 'day': d.setDate(d.getDate() - v); break;
      case 'week': d.setDate(d.getDate() - v * 7); break;
      case 'month': d.setMonth(d.getMonth() - v); break;
      case 'year': d.setFullYear(d.getFullYear() - v); break;
    }
    return d.toISOString();
  }
  return fallback.toISOString();
}

function buildJob(raw: {
  title: string;
  company: string;
  companyLogo?: string;
  location?: string;
  salary?: string;
  jobType?: string;
  description?: string;
  postedDate?: string;
  url: string;
  source: string;
  categories?: string[];
}): Job | null {
  const title = cleanHtml(raw.title).trim();
  const company = cleanHtml(raw.company).trim();
  if (!title || !company || !raw.url) return null;

  const description = cleanDescription(cleanHtml(raw.description || ''));
  const salary = cleanSalary(raw.salary || '');
  const { min: salaryMin, max: salaryMax } = parseSalaryRange(salary);
  const fullText = `${title} ${raw.jobType || ''} ${description}`;
  const jobType = raw.jobType ? inferJobType(raw.jobType) : inferJobType(fullText);
  const location = cleanHtml(raw.location || 'Remote').trim() || 'Remote';

  if (!isUSOrRemoteJob(location, description)) return null;

  return {
    id: makeJobId(raw.url, title, company),
    title,
    company,
    companyLogo: raw.companyLogo,
    location,
    isRemote: /remote|anywhere|worldwide|distributed/i.test(location),
    salary,
    salaryMin,
    salaryMax,
    jobType,
    experienceLevel: inferExperienceLevel(title, description),
    categories: raw.categories || [],
    description,
    requirements: extractBulletSection(description, ['Requirements', 'Qualifications', 'What you need', 'Must have', 'Skills required', 'What we look for', 'What You will Bring']),
    responsibilities: extractBulletSection(description, ['Responsibilities', 'What you will do', 'You will', 'Role', 'The role']),
    techStack: extractTechStack(description),
    benefits: extractBenefits(description),
    url: raw.url,
    source: raw.source,
    postedAt: standardizePostedDate(raw.postedDate),
    scrapedAt: new Date().toISOString(),
    isActive: true,
  };
}

function toPrismaJobType(t: ScraperJobType): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' {
  switch (t) {
    case 'FULL_TIME': return 'FULL_TIME';
    case 'PART_TIME': return 'PART_TIME';
    case 'CONTRACT': return 'CONTRACT';
    case 'INTERNSHIP': return 'INTERNSHIP';
    default: return 'FULL_TIME';
  }
}

export function toDbJob(job: Job): Prisma.JobCreateInput {
  let postedAt: Date | undefined;
  try {
    postedAt = job.postedAt ? new Date(job.postedAt) : undefined;
    if (postedAt && isNaN(postedAt.getTime())) postedAt = undefined;
  } catch {
    postedAt = undefined;
  }

  const companyKey = job.company.toLowerCase().trim();
  const positionKey = job.title.toLowerCase().trim();
  const locationKey = (() => {
    const raw = (job.location ?? 'remote').toLowerCase().trim();
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
    ) return 'remote';
    return raw;
  })();

  return {
    position: job.title,
    company: job.company,
    location: job.location || null,
    salary: (job.salary && /[\d$\u20ac\u00a3\u00a5\u20b9]/.test(job.salary)) ? job.salary : null,
    type: toPrismaJobType(job.jobType),
    url: job.url,
    source: job.source,
    description: job.description?.trim() || null,
    companyKey,
    positionKey,
    locationKey,
    ...(postedAt ? { postedAt } : {}),
  };
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

abstract class JobBoardScraper {
  private browser: Browser | null = null;
  protected config: Required<ScraperOptions>;

  constructor(config: ScraperOptions = {}) {
    this.config = {
      headless: config.headless ?? true,
      delay: config.delay ?? 1500,
      timeout: config.timeout ?? 60000,
      userAgent: config.userAgent ?? DEFAULT_UA,
      maxRetries: config.maxRetries ?? 3,
      outputDir: config.outputDir ?? './scraped_jobs',
    };
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--window-size=1920,1080',
        `--user-agent=${this.config.userAgent}`,
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) { await this.browser.close(); this.browser = null; }
  }

  abstract scrape(query: string, pages?: number): Promise<ScraperResult>;

  protected async createPage(): Promise<Page> {
    if (!this.browser) throw new Error('Call initialize() first.');
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

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

  protected sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let i = 0; i < this.config.maxRetries; i++) {
      try { return await fn(); } catch (e) {
        if (i === this.config.maxRetries - 1) throw e;
        const wait = 2000 * (i + 1);
        console.log(chalk.yellow(`  ⚠  Retry ${i + 1}/${this.config.maxRetries} in ${wait / 1000}s...`));
        await this.sleep(wait);
      }
    }
    throw new Error('All retries exhausted');
  }

  protected pushIfValid(jobs: Job[], candidate: Job | null, fc: { n: number }): void {
    if (candidate) jobs.push(candidate);
    else fc.n++;
  }
}

export class WeWorkRemotelyScraper extends JobBoardScraper {
  async scrape(query: string, _pages = 2): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };

    const feeds = [
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
    ];

    for (const feedUrl of feeds) {
      try {
        console.log(chalk.dim(`  [WWR] RSS (direct) → ${feedUrl}`));
        const rawXml = await httpsGet(feedUrl, this.config.timeout);

        if (rawXml.trim().startsWith('<html') || rawXml.trim().startsWith('<!DOCTYPE')) {
          console.warn(chalk.yellow(`  ⚠ [WWR] ${feedUrl.split('/').pop()}: got HTML instead of XML — skipping`));
          continue;
        }

        const $ = cheerio.load(rawXml, { xmlMode: true });
        const countBefore = jobs.length;

        $('item').each((_, el) => {
          const $el = $(el);
          const rawTitle = $el.find('title').first().text().trim();
          const colonIdx = rawTitle.indexOf(': ');
          const company = colonIdx > -1 ? rawTitle.substring(0, colonIdx).trim() : '';
          const title = colonIdx > -1 ? rawTitle.substring(colonIdx + 2).trim() : rawTitle;
          const jobUrl = $el.find('guid').text().trim() || $el.children('link').text().trim() || '';
          const postedDate = $el.find('pubDate').text().trim();
          const region = $el.find('region').text().trim() || 'Remote, USA';

          const rawCdata = $el.find('description').text();
          const $inner = cheerio.load(rawCdata);
          const listingHtml = $inner('.listing-container').html()
            || $inner('[class*="listing"]').html()
            || rawCdata;
          const description = cleanDescription(cleanHtml(listingHtml));

          if (query && !title.toLowerCase().includes(query.toLowerCase()) &&
            !description.toLowerCase().includes(query.toLowerCase())) return;

          this.pushIfValid(jobs, buildJob({
            title, company, location: region, description,
            url: jobUrl, source: 'We Work Remotely', postedDate,
          }), fc);
        });

        console.log(chalk.gray(`  [WWR] ${feedUrl.split('/').pop()}: items=${$('item').length} new=${jobs.length - countBefore} filtered=${fc.n}`));
        await this.sleep(500);
      } catch (e: any) {
        const msg = `[WWR] ${feedUrl.split('/').pop()}: ${e?.message || e}`;
        errors.push(msg);
        console.error(chalk.red(`  ✖ ${msg}`));
      }
    }

    return { source: 'We Work Remotely', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class RemoteOKScraper extends JobBoardScraper {
  async scrape(query: string, pages = 2): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const slug = query.replace(/\s+/g, '-').toLowerCase();
        const url = `https://remoteok.com/remote-usa-${encodeURIComponent(slug)}-jobs?page=${p}`;
        console.log(chalk.dim(`  [RemoteOK] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
        await this.sleep(this.config.delay);
        const $ = cheerio.load(await page.content());
        $('tr.job').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('data-href') || '';
          const jobUrl = href ? `https://remoteok.com${href}` : '';
          const title = cleanHtml($el.find('h2').html() || '');
          const company = cleanHtml($el.find('.companyLink h3').html() || '');
          const location = cleanHtml($el.find('.location').html() || '') || 'Remote, USA';
          const salary = cleanHtml($el.find('.salary').html() || '');
          const tags = $el.find('.tags a').map((_, t) => $(t).text().trim()).get();
          const logo = $el.find('img.logo').attr('src') || '';
          const postedDate = $el.find('td.time time').attr('datetime') || '';
          const descHtml = $el.find('.expanded td').html() || '';
          const description = descHtml ? cleanDescription(cleanHtml(descHtml)) : '';
          this.pushIfValid(jobs, buildJob({ title, company, location, salary, description, url: jobUrl, source: 'RemoteOK', postedDate, categories: tags, companyLogo: logo }), fc);
        });
        console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      const msg = `[RemoteOK] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'RemoteOK', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class RemotiveScraper extends JobBoardScraper {
  async scrape(query: string, _pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    try {
      const apiUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=150`;
      console.log(chalk.dim(`  [Remotive] API (direct) → ${apiUrl}`));

      const rawText = await httpsGet(apiUrl, this.config.timeout);

      if (rawText.trim().startsWith('<')) {
        errors.push('[Remotive] API returned HTML (bot-detection page) — skipping');
        console.warn(chalk.yellow(`  ⚠ [Remotive] Got HTML instead of JSON — Cloudflare may be blocking`));
        return { source: 'Remotive', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
      }

      let apiData: any;
      try { apiData = JSON.parse(rawText); } catch {
        errors.push('[Remotive] Failed to parse API JSON response');
        return { source: 'Remotive', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
      }

      const postings: any[] = apiData.jobs || [];
      console.log(chalk.dim(`  [Remotive] API returned ${postings.length} jobs`));

      for (const post of postings) {
        const location = post.candidate_required_location || 'Remote';
        this.pushIfValid(jobs, buildJob({
          title: post.title || '',
          company: post.company_name || '',
          location,
          salary: post.salary || '',
          description: cleanHtml(post.description || ''),
          url: post.url || '',
          source: 'Remotive',
          postedDate: post.publication_date || '',
          companyLogo: post.logo || '',
          categories: post.tags || [],
        }), fc);
      }
      console.log(chalk.gray(`     → kept=${jobs.length} filtered=${fc.n}`));
    } catch (e: any) {
      const msg = `[Remotive] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    }
    return { source: 'Remotive', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class YCombinatorScraper extends JobBoardScraper {
  async scrape(query: string, pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const url = `https://www.ycombinator.com/jobs?query=${encodeURIComponent(query)}&remote=true&usOnly=true&page=${p}`;
        console.log(chalk.dim(`  [YC] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
        await this.sleep(this.config.delay);

        const dataPage = await page.evaluate(() => {
          const el = document.querySelector('[id^="WaasLandingPage-react-component-"]');
          return el ? el.getAttribute('data-page') : null;
        });

        if (!dataPage) { const msg = '[YC] data-page attribute not found'; errors.push(msg); console.warn(chalk.yellow(`  ⚠ ${msg}`)); continue; }

        let postings: any[] = [];
        try { postings = JSON.parse(dataPage)?.props?.jobPostings || []; } catch {
          const msg = '[YC] Failed to parse data-page JSON'; errors.push(msg); console.warn(chalk.yellow(`  ⚠ ${msg}`)); continue;
        }

        for (const posting of postings) {
          this.pushIfValid(jobs, buildJob({
            title: posting.title,
            company: posting.companyName,
            location: posting.location || 'Remote, USA',
            salary: posting.salaryRange || '',
            description: posting.companyOneLiner || '',
            url: posting.url ? `https://www.ycombinator.com${posting.url}` : '',
            source: 'Y Combinator',
            postedDate: posting.createdAt || '',
            companyLogo: posting.companyLogoUrl || '',
            categories: posting.tags || [],
          }), fc);
        }
        console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      const msg = `[YC] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'Y Combinator', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class NoDeskScraper extends JobBoardScraper {
  async scrape(query: string, pages = 2): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    const seenUrls = new Set<string>();
    try {
      for (let p = 0; p < pages; p++) {
        const url = `https://nodesk.co/remote-jobs/?search=${encodeURIComponent(query)}&page=${p}`;
        console.log(chalk.dim(`  [NoDesk] page ${p + 1} → ${url}`));
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
        await this.sleep(this.config.delay * 2);
        const $ = cheerio.load(await page.content());

        let newOnPage = 0;
        $('li.ais-Hits-item').each((_, el) => {
          const $el = $(el);
          const title = $el.find('h2 a').text().trim() || $el.find('h2').text().trim();
          const company = $el.find('h3').text().trim();
          const location = $el.find('.inline-flex h5, [class*="location"]').first().text().trim() || 'Remote';
          const logo = $el.find('img').attr('src') || '';
          let href = $el.find('h2 a').attr('href') || $el.find('a').first().attr('href') || '';
          if (href && !href.startsWith('http')) href = `https://nodesk.co${href}`;
          if (!href || seenUrls.has(href)) return;
          seenUrls.add(href);
          newOnPage++;
          this.pushIfValid(jobs, buildJob({ title, company, location, url: href, source: 'NoDesk', companyLogo: logo }), fc);
        });

        console.log(chalk.gray(`     → page ${p + 1}: kept=${jobs.length} filtered=${fc.n} new=${newOnPage}`));
        if (newOnPage === 0 && p > 0) { console.log(chalk.dim(`  [NoDesk] no new results on page ${p + 1}, stopping`)); break; }
      }
    } catch (e: any) {
      const msg = `[NoDesk] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'NoDesk', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class HubstaffTalentScraper extends JobBoardScraper {
  async scrape(query: string, pages = 2): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const url = `https://talent.hubstaff.com/search/jobs?search%5Bkeywords%5D=${encodeURIComponent(query)}&search%5Bremote%5D=1&search%5Blocation%5D=United+States&page=${p}`;
        console.log(chalk.dim(`  [Hubstaff] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
        await this.sleep(this.config.delay * 2);
        const $ = cheerio.load(await page.content());
        $('div.main-details').each((_, el) => {
          const $el = $(el);
          const title = $el.find('a.name').text().trim();
          const company = $el.find('.job-company a').first().text().trim();
          const location = $el.find('.job-company .location').text().trim() || 'Remote, USA';
          const salary = cleanHtml($el.find('.pay-rate').html() || '');
          const description = cleanDescription(cleanHtml($el.find('.profil-bio').html() || ''));
          let href = $el.find('a.name').attr('href') || '';
          if (href && !href.startsWith('http')) href = `https://talent.hubstaff.com${href}`;
          const postedDate = $el.find('.a-tooltip').text().trim();
          this.pushIfValid(jobs, buildJob({ title, company, location, salary, description, url: href, source: 'Hubstaff Talent', postedDate }), fc);
        });
        console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      const msg = `[Hubstaff] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'Hubstaff Talent', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class SkipTheDriveScraper extends JobBoardScraper {
  async scrape(query: string, pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const url = `https://www.skipthedrive.com/?s=${encodeURIComponent(query)}&paged=${p}`;
        console.log(chalk.dim(`  [SkipTheDrive] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
        await this.sleep(this.config.delay);
        const $ = cheerio.load(await page.content());
        $('.post-content').each((_, el) => {
          const $el = $(el);
          const title = $el.find('h2.post-title.entry-title a').text().trim();
          const company = $el.find('.custom_fields_company_name_display_search_results').text().replace(/^\s*\n?\s*\u00a0/, '').trim();
          const postedDate = $el.find('.custom_fields_job_date_display_search_results').text().trim();
          const allParaHtml = $el.find('.entry-content, .post-excerpt').html()
            || $el.find('p').map((_, p) => $(p).html()).get().join('\n')
            || '';
          const description = cleanDescription(cleanHtml(allParaHtml));
          const href = $el.find('h2.post-title.entry-title a').attr('href') || '';
          this.pushIfValid(jobs, buildJob({ title, company, location: 'Remote, USA', description, url: href, source: 'SkipTheDrive', postedDate }), fc);
        });
        console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      const msg = `[SkipTheDrive] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'SkipTheDrive', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class RemoteHubScraper extends JobBoardScraper {
  async scrape(query: string, pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const url = `https://www.remotehub.com/jobs/search?search=${encodeURIComponent(query)}&location_type=remote&country=United+States&page=${p}`;
        console.log(chalk.dim(`  [RemoteHub] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
        await this.sleep(this.config.delay * 2);
        const $ = cheerio.load(await page.content());
        $('mat-card.mat-card').each((_, el) => {
          const $el = $(el);
          const title = $el.find('.title.primary').text().trim();
          const company = $el.find('.account-name').text().trim();
          const location = $el.find('.location .text').text().trim() || 'Remote, USA';
          const salary = cleanHtml($el.find('.mat-chip.blue-2').html() || '');
          const description = cleanDescription(cleanHtml($el.find('.description').html() || ''));
          let href = $el.find('.entity-detailed-link').attr('href') || '';
          if (href && !href.startsWith('http')) href = `https://www.remotehub.com${href}`;
          this.pushIfValid(jobs, buildJob({ title, company, location, salary, description, url: href, source: 'RemoteHub' }), fc);
        });
        console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      const msg = `[RemoteHub] ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
    } finally { await page.close(); await this.close(); }
    return { source: 'RemoteHub', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class LinkedInScraper extends JobBoardScraper {
  async scrape(query: string, pages = 2): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    const geoId = '103644278';

    try {
      await httpsGet('https://www.linkedin.com/robots.txt', 5000);
    } catch (e: any) {
      const msg = `[LinkedIn] Pre-flight check failed — LinkedIn is unreachable (${e?.message || e}). Skipping all pages.`;
      errors.push(msg); console.warn(chalk.yellow(`  ⚠ ${msg}`));
      return { source: 'LinkedIn', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
    }

    await this.initialize();

    for (let p = 0; p < pages; p++) {
      const page = await this.createPage();
      try {
        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=United%20States&geoId=${geoId}&f_WT=2&start=${p * 25}`;
        console.log(chalk.dim(`  [LinkedIn] page ${p + 1} → ${url}`));
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await this.sleep(this.config.delay + Math.floor(Math.random() * 800));

        const $ = cheerio.load(await page.content());
        const cards = $('li');
        let newOnPage = 0;

        cards.each((_, el) => {
          const $el = $(el);
          const title =
            $el.find('h3.base-search-card__title').text().trim() ||
            $el.find('[class*="job-title"]').text().trim() ||
            $el.find('a.base-card__full-link').attr('aria-label') || '';
          const company =
            $el.find('h4.base-search-card__subtitle a').text().trim() ||
            $el.find('h4.base-search-card__subtitle').text().trim() ||
            $el.find('[class*="company"]').first().text().trim();
          const location =
            $el.find('span.job-search-card__location').text().trim() ||
            $el.find('[class*="location"]').first().text().trim() ||
            'Remote, United States';
          let href =
            $el.find('a.base-card__full-link').attr('href') ||
            $el.find('a[href*="/jobs/view/"]').attr('href') || '';
          if (href && href.includes('?')) href = href.split('?')[0];
          const jobUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
          const postedDate =
            $el.find('time.job-search-card__listdate').attr('datetime') ||
            $el.find('time').attr('datetime') || '';
          const logo = $el.find('img.artdeco-entity-image').attr('data-delayed-url') || $el.find('img').attr('src') || '';

          if (!title || !company || !href) return;
          newOnPage++;
          this.pushIfValid(jobs, buildJob({ title, company, location, url: jobUrl, source: 'LinkedIn', postedDate, companyLogo: logo }), fc);
        });

        console.log(chalk.gray(`     → page ${p + 1}: kept=${jobs.length} filtered=${fc.n} new=${newOnPage}`));
        if (newOnPage === 0) { console.log(chalk.dim(`  [LinkedIn] no results on page ${p + 1}, stopping`)); await page.close(); break; }
      } catch (e: any) {
        const msg = `[LinkedIn] page ${p + 1}: ${e?.message || e}`; errors.push(msg); console.error(chalk.red(`  ✖ ${msg}`));
        if (p === 0 && (String(e?.message).includes('DISCONNECTED') || String(e?.message).includes('ERR_'))) {
          console.warn(chalk.yellow(`  ⚠ [LinkedIn] Network error on page 1 — skipping remaining pages`));
          await page.close().catch(() => { }); break;
        }
      } finally { try { await page.close(); } catch { /* already closed */ } }
      if (p < pages - 1) await this.sleep(this.config.delay);
    }

    await Promise.race([this.close(), new Promise<void>(resolve => setTimeout(resolve, 5000))]);
    return { source: 'LinkedIn', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}

export class JobDetailEnricher extends JobBoardScraper {
  async scrape(_query: string, _pages?: number): Promise<ScraperResult> {
    return { source: 'JobDetailEnricher', jobs: [], scrapedAt: new Date().toISOString(), durationMs: 0, errors: [], filtered: 0 };
  }

  async enrich(jobs: Job[], concurrency = 3): Promise<Job[]> {
    await this.initialize();
    const enriched: Job[] = [];
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const results = await Promise.all(batch.map(j => this.enrichOne(j)));
      enriched.push(...results);
    }
    await this.close();
    return enriched;
  }

  private async enrichOne(job: Job): Promise<Job> {
    const page = await this.createPage();
    try {
      await page.goto(job.url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
      await this.sleep(800);

      const rawHtml = await page.evaluate((source: string) => {
        const SOURCE_SELECTORS: Record<string, string[]> = {
          'We Work Remotely': ['.listing-container', '[class*="listing-container"]', 'article'],
          'RemoteOK': ['.markdown', '#job-description', 'td.markdown', '[id*="job"]'],
          'Remotive': ['.job-description', '[class*="job-description"]'],
          'Working Nomads': ['.job-description', '[class*="description"]', 'article', 'main'],
          'Y Combinator': ['.prose', '[class*="description"]', 'main'],
          'NoDesk': ['article.job', '.job-description', '[class*="content"]', 'main'],
          'Hubstaff Talent': ['.job-description', '.description', '[class*="description"]'],
          'SkipTheDrive': ['.entry-content', '.post-content', 'article', 'main'],
          'Jobspresso': ['.job_description', '[class*="description"]', '.entry-content'],
          'RemoteHub': ['.job-description', '.description', '[class*="description"]'],
          'LinkedIn': ['.description__text', '.show-more-less-html__markup', '[class*="description"]'],
        };

        const GENERIC_FALLBACK = [
          '[class*="job-description"]',
          '[class*="jobDescription"]',
          '[class*="job-detail"]',
          '[class*="job_description"]',
          'article',
          'main',
        ];

        const selectors = [...(SOURCE_SELECTORS[source] || []), ...GENERIC_FALLBACK];

        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 200) {
            return el.innerHTML;
          }
        }
        return document.body.innerHTML;
      }, job.source);

      const enrichedDescription = cleanDescription(cleanHtml(rawHtml));
      const enrichedIsValid = isLikelyRealDescription(enrichedDescription);

      const useEnriched = enrichedIsValid && enrichedDescription.length > (job.description?.length ?? 0);
      const finalDescription = useEnriched ? enrichedDescription : (job.description || enrichedDescription);
      const descToUse = finalDescription || job.description || '';

      return {
        ...job,
        description: descToUse,
        requirements: extractBulletSection(descToUse, ['Requirements', 'Qualifications', 'What you need', 'Must have', 'Skills required']),
        responsibilities: extractBulletSection(descToUse, ['Responsibilities', 'What you will do', 'You will', 'Role', 'The role']),
        techStack: extractTechStack(descToUse),
        benefits: extractBenefits(descToUse),
      };
    } catch { return job; } finally { await page.close(); }
  }
}

interface IJobService {
  saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{ added: number; duplicates: number; skipped: number }>;
}

type ScrapeJobConfig = { scraper: JobBoardScraper; query: string; pages?: number };

export class ScraperManager {
  private config: ScraperOptions;

  constructor(
    _container: any,
    _cache: any,
    private jobService: IJobService,
    config: ScraperOptions = {}
  ) {
    this.config = config;
  }

  protected getScrapeJobs(): ScrapeJobConfig[] {
    return [
      { scraper: new WeWorkRemotelyScraper(this.config), query: 'developer', pages: 2 },
      { scraper: new RemoteOKScraper(this.config), query: 'developer', pages: 1 },
      { scraper: new RemotiveScraper(this.config), query: 'engineer', pages: 1 },
      { scraper: new YCombinatorScraper(this.config), query: 'software', pages: 1 },
      { scraper: new NoDeskScraper(this.config), query: 'remote', pages: 2 },
      { scraper: new HubstaffTalentScraper(this.config), query: 'developer', pages: 2 },
      { scraper: new SkipTheDriveScraper(this.config), query: 'developer', pages: 1 },
      { scraper: new RemoteHubScraper(this.config), query: 'developer', pages: 1 },
      { scraper: new LinkedInScraper(this.config), query: 'software engineer', pages: 2 },
    ];
  }

  private normalizeSourceName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private getSourceName(scraper: JobBoardScraper): string {
    const className = (scraper as any).constructor?.name ?? 'Unknown';
    const sourceNames: Record<string, string> = {
      WeWorkRemotelyScraper: 'We Work Remotely',
      RemoteOKScraper: 'RemoteOK',
      RemotiveScraper: 'Remotive',
      YCombinatorScraper: 'Y Combinator',
      NoDeskScraper: 'NoDesk',
      HubstaffTalentScraper: 'Hubstaff Talent',
      SkipTheDriveScraper: 'SkipTheDrive',
      RemoteHubScraper: 'RemoteHub',
      LinkedInScraper: 'LinkedIn',
    };
    return sourceNames[className] ?? className.replace(/Scraper$/, '');
  }

  private matchesSource(scraper: JobBoardScraper, requestedSource: string): boolean {
    const requested = this.normalizeSourceName(requestedSource);
    const sourceName = this.normalizeSourceName(this.getSourceName(scraper));
    const className = this.normalizeSourceName((scraper as any).constructor?.name ?? '');
    const shortClassName = this.normalizeSourceName(((scraper as any).constructor?.name ?? '').replace(/Scraper$/, ''));

    return requested === sourceName || requested === className || requested === shortClassName;
  }

  private async runScrapeJob({ scraper, query, pages }: ScrapeJobConfig): Promise<ScrapeRunResult> {
    const name = (scraper as any).constructor?.name ?? 'Unknown';
    console.log(chalk.blue(`
▶ ${name}  query="${query}"  pages=${pages ?? 1}`));

    try {
      const result = await scraper.scrape(query, pages);

      let jobsToSave = result.jobs;
      if (jobsToSave.length > 0) {
        try {
          const enricher = new JobDetailEnricher(this.config);
          console.log(chalk.dim('  ⤷ Enriching job details (fetching full descriptions)...'));
          jobsToSave = await enricher.enrich(jobsToSave, 3);
          console.log(chalk.dim(`  ⤷ Enrichment complete: ${jobsToSave.length} jobs`));
        } catch (e: any) {
          console.warn(chalk.yellow(`  ⚠ Job detail enrichment failed: ${e?.message || e}`));
        }
      }

      const dbJobs = jobsToSave.map(toDbJob);
      const { added, duplicates } = await this.jobService.saveJobs(dbJobs);

      console.log(chalk.green(
        `  ✔ ${result.source}: found=${result.jobs.length} added=${added} dup=${duplicates} filtered=${result.filtered} time=${(result.durationMs / 1000).toFixed(1)}s`
      ));
      if (result.errors.length > 0) {
        result.errors.forEach(e => console.warn(chalk.yellow(`  ⚠  ${e}`)));
      }

      return {
        source: result.source,
        jobsFound: result.jobs.length,
        jobsAdded: added,
        jobsDuplicate: duplicates,
        jobsFiltered: result.filtered,
        status: 'SUCCESS',
        duration: result.durationMs,
      };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(chalk.red(`  ✖ ${name} failed: ${msg}`));
      return {
        source: this.getSourceName(scraper),
        jobsFound: 0,
        jobsAdded: 0,
        jobsDuplicate: 0,
        jobsFiltered: 0,
        status: 'FAILED',
        error: msg,
        duration: 0,
      };
    }
  }

  async runAll(): Promise<ScrapeRunResult[]> {
    const results: ScrapeRunResult[] = [];

    for (const scrapeJob of this.getScrapeJobs()) {
      results.push(await this.runScrapeJob(scrapeJob));
    }

    const totalFound = results.reduce((s, r) => s + r.jobsFound, 0);
    const totalAdded = results.reduce((s, r) => s + r.jobsAdded, 0);
    const totalFiltered = results.reduce((s, r) => s + r.jobsFiltered, 0);
    const errCount = results.filter(r => r.status === 'FAILED').length;

    console.log(chalk.bold.cyan('══════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  SCRAPE COMPLETE  (US Remote jobs only)'));
    console.log(chalk.bold.cyan('══════════════════════════════════════════════'));
    console.log(chalk.white(`  Sources:         ${results.length}`));
    console.log(chalk.white(`  Jobs found:      ${totalFound}`));
    console.log(chalk.green(`  Added to DB:     ${totalAdded}`));
    console.log(chalk.yellow(`  Non-US filtered: ${totalFiltered}`));
    if (errCount > 0) console.log(chalk.red(`  Errors:          ${errCount} source(s) failed`));
    console.log(chalk.bold.cyan('══════════════════════════════════════════════'));

    return results;
  }

  async runOne(source: string): Promise<ScrapeRunResult> {
    const scrapeJob = this.getScrapeJobs().find(({ scraper }) => this.matchesSource(scraper, source));

    if (!scrapeJob) {
      const availableSources = this.getScrapeJobs()
        .map(({ scraper }) => this.getSourceName(scraper))
        .join(', ');
      throw new Error(`Source "${source}" not found. Available sources: ${availableSources}`);
    }

    return await this.runScrapeJob(scrapeJob);
  }
}

export { cleanHtml as stripHtml, cleanDescription as stripDescription, extractBulletSection as extractSection };

async function buildCache(): Promise<CacheService> {
  const cache = new CacheService();
  try {
    await cache.connect();
    console.log(chalk.green('  ✔ Cache connected'));
  } catch {
    console.warn(chalk.yellow('  ⚠ Redis unavailable — cache ops will be no-ops (scrape will still save to DB)'));
  }
  return cache;
}

async function main() {
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║  JOB SCRAPER  —  US Remote Jobs Only         ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════╝\n'));

  try {
    await db.$connect();
    console.log(chalk.green('  ✔ Database connected\n'));
  } catch (err: any) {
    console.error(chalk.red('  ✖ Failed to connect to database:'), err?.message || err);
    console.error(chalk.red('    Check DATABASE_URL in your .env file'));
    process.exit(1);
  }

  const cache = await buildCache();
  const jobService = new JobService(container, cache);
  const manager = new ScraperManager(null, null, jobService, { headless: true } as ScraperOptions);

  console.log(chalk.cyan('Starting scrape run across 11 job boards...\n'));
  const t0 = Date.now();

  let results: ScrapeRunResult[] = [];
  try {
    results = await manager.runAll();

    const logInserts = results.map(r =>
      db.scrapeLog.create({
        data: {
          source: r.source,
          status: r.status,
          jobsFound: r.jobsFound,
          jobsAdded: r.jobsAdded,
          errorMessage: r.error ?? null,
          durationMs: r.duration,
        },
      })
    );
    await Promise.allSettled(logInserts);
    console.log(chalk.dim(`  📋 Wrote ${results.length} ScrapeLog entries`));

  } finally {
    await Promise.allSettled([
      db.$disconnect(),
      cache.disconnect().catch(() => { }),
    ]);
    console.log(chalk.dim('\n  Connections closed'));
  }

  const totalTime = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  console.log(chalk.gray(`\nTotal runtime: ${totalTime} minutes\n`));

  const failed = results.filter(r => r.status === 'FAILED');
  console.log(chalk.cyan('Per-source breakdown:'));
  results.forEach(r => {
    const icon = r.status === 'FAILED' ? chalk.red('✖') : chalk.green('✔');
    console.log(chalk.white(`  ${icon} ${r.source.padEnd(20)} added=${r.jobsAdded} dup=${r.jobsDuplicate} filtered=${r.jobsFiltered}`));
  });
  if (failed.length > 0) {
    console.log(chalk.red(`\n  ${failed.length} source(s) failed: ${failed.map(f => f.source).join(', ')}`));
  }

  console.log(chalk.bold.cyan('\n✅ Done!\n'));
  process.exit(0);
}

const isMain = (typeof require !== 'undefined' && require.main === module)
  || (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && process.argv[1].endsWith('src/scrape.ts'));

if (isMain) {
  main().catch(err => {
    console.error(chalk.red('\n✖ Fatal error:'), err);
    process.exit(1);
  });
}