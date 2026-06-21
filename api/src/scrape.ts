import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import https from 'https';
import type { Prisma } from '@prisma/client';
import { CacheService } from './cache';
import { JobService } from './services/job.svc';
import { JobProcessor, type JobProcessResult } from './services/job.processor';
import { db } from './lib/prisma';
import container from './container';


const TRACE = process.env.TRACE === 'true';
const DEBUG_LOGS = process.env.DEBUG === 'true' || TRACE;

type SourceHealth = 'OK' | 'DEGRADED' | 'FAILED';

type RunHealth = 'OK' | 'DEGRADED' | 'FAILED';

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.0s';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function truncateCell(value: string, max = 22): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function pad(value: string | number, width: number, align: 'left' | 'right' = 'left'): string {
  const str = String(value);
  if (str.length >= width) return str;
  return align === 'right' ? str.padStart(width) : str.padEnd(width);
}

function compactRecord(record: Record<string, number> | undefined): string {
  if (!record) return '-';
  const items = Object.entries(record).filter(([, count]) => count > 0);
  if (items.length === 0) return '-';
  return items.map(([key, count]) => `${key}:${count}`).join(', ');
}

function isNetworkError(message = ''): boolean {
  return /EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|network/i.test(message);
}

function isDbError(message = ''): boolean {
  return /db\.prisma\.io|Prisma|P1008|SocketTimeout|DATABASE|scrapeLog|findFirst|job\.update/i.test(message);
}

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


async function httpsGetWithRetry(url: string, timeoutMs = 15000, retries = 2): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await httpsGet(url, timeoutMs);
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 900 * (i + 1)));
    }
  }
  throw lastError;
}

export type ScraperJobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE' | 'UNKNOWN';
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE' | 'UNKNOWN';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string | undefined;
  location: string;
  isRemote: boolean;
  timezone?: string | undefined;
  salary?: string | undefined;
  salaryMin?: number | undefined;
  salaryMax?: number | undefined;
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
  jobsSkipped: number;
  jobsValidated: number;
  enriched: number;
  enrichmentFailed: number;
  avgDescriptionChars: number;
  descriptionUpdated: number;
  status: 'SUCCESS' | 'FAILED';
  health: SourceHealth;
  error?: string;
  errors: string[];
  warnings: string[];
  skipReasons: Record<string, number>;
  extractionMethods: Record<string, number>;
  quality: {
    badDescriptions: number;
    missingCompany: number;
    missingLocation: number;
    enrichmentFailures: number;
    warningRate: number;
    rejectionRate: number;
    duplicateRate: number;
  };
  dbErrors: number;
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
  'united kingdom', 'uk', 'england', 'london', 'scotland', 'wales',
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
  'usa & canada', 'usa/canada',
];

export function isUSOrRemoteJob(location: string, _description = ''): boolean {
  const rawLoc = location || '';
  const loc = rawLoc
    .toLowerCase()
    .replace(/[🌏🌎🌍🇺🇸]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const containsNonUsLocation = NON_US_COUNTRIES.some(c => {
    if (c.length <= 3) return new RegExp(`\\b${c}\\b`, 'i').test(loc);
    return loc.includes(c);
  });

  const stateMatches = rawLoc.match(/\b([A-Z]{2})\b/g);
  const hasUsState = Boolean(stateMatches && stateMatches.some(s => US_STATES.has(s)));

  const hasExplicitUsLocation =
    /\b(united states|usa|u\.s\.|us only|usa only|united states only|remote us|us remote|remote \(us\)|remote - us|remote - united states|remote, usa|usa & canada|usa\/canada|north america|new york|san francisco|los angeles|chicago|seattle|boston|austin|denver|atlanta|miami|dallas|houston|new jersey|washington dc|washington d\.c)\b/.test(loc) ||
    hasUsState;

  if (hasExplicitUsLocation) return true;
  if (containsNonUsLocation) return false;

  return false;
}

export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

    // Preserve common HTML headings as markdown-style heading markers.
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

  const trailingTrimmed = cutIndex !== -1 ? lines.slice(0, cutIndex) : lines;
  const startIndex = trailingTrimmed.findIndex((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (index === 0 && !/^(home|general|jobs|close|menu|breadcrumb)$/i.test(trimmed)) return true;
    return /^(about the role|about this role|the role|responsibilities|requirements|qualifications|what you('|’)ll do|what you will do|job description|description)$/i.test(trimmed)
      || /\b(we are looking|we're looking|you will|responsibilities include|requirements include)\b/i.test(trimmed);
  });

  const kept = startIndex > 0 ? trailingTrimmed.slice(startIndex) : trailingTrimmed;
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isLinkedInAuthWall(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
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
  ].some(signal => normalized.includes(signal));
}

function isRemoteHubPageWrapper(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const compact = normalized.replace(/[^a-z0-9]+/g, '');
  return (
    compact.includes('closehomehomegeneral') ||
    (
      /\bsimilar jobs\b|\brelated jobs\b|\brecommended jobs\b/i.test(normalized) &&
      /\b(home|general|jobs|companies|post a job|sign in|log in|menu|close)\b/i.test(normalized)
    )
  );
}

function isLikelyRealDescription(text: string): boolean {
  if (!text || text.trim().length < 80) return false;
  if (isLinkedInAuthWall(text) || isRemoteHubPageWrapper(text)) return false;
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
  companyLogo?: string | undefined;
  location?: string;
  salary?: string | undefined;
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
    ) return 'remote';

    return normalized || raw;
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
      if (['image', 'media', 'font', 'stylesheet'].includes(rt)) req.abort();
      else req.continue();
    });

    return page;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
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
  async scrape(query: string, pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    const seen = new Set<string>();

    // Prefer RemoteOK public API over browser scraping. It is lighter on CPU/RAM and
    // avoids the listing-page markup changes that caused kept=0/filter noise.
    try {
      const apiUrl = `https://remoteok.com/api?search=${encodeURIComponent(query)}&location=usa`;
      console.log(chalk.dim(`  [RemoteOK] API → ${apiUrl}`));
      const raw = await httpsGet(apiUrl, Math.min(this.config.timeout, 15000));

      if (!raw.trim().startsWith('[')) {
        errors.push('[RemoteOK] API returned non-JSON response; falling back to lightweight HTML scrape');
      } else {
        const rows: any[] = JSON.parse(raw).filter((x: any) => x && typeof x === 'object' && !x.legal);
        for (const post of rows.slice(0, 50)) {
          const title = String(post.position || post.title || '').trim();
          const company = String(post.company || '').trim();
          const slug = post.slug || post.id || '';
          const url = String(post.url || (slug ? `https://remoteok.com/remote-jobs/${slug}` : '')).trim();
          if (!title || !company || !url || seen.has(url)) { fc.n++; continue; }
          seen.add(url);

          const location = cleanHtml(String(post.location || 'Remote, USA')).trim() || 'Remote, USA';
          const salary = cleanHtml(String(post.salary || post.salary_min || post.salary_max || '')).trim();
          const description = cleanDescription(cleanHtml(String(post.description || '')));
          const tags = Array.isArray(post.tags) ? post.tags.map(String) : [];
          const logo = String(post.logo || post.company_logo || '');
          const postedDate = String(post.date || post.epoch || '');

          this.pushIfValid(jobs, buildJob({
            title, company, location, salary, description, url,
            source: 'RemoteOK', postedDate, categories: tags, companyLogo: logo,
          }), fc);
        }
        console.log(chalk.gray(`     → api: kept=${jobs.length} filtered=${fc.n}`));
      }
    } catch (e: any) {
      errors.push(`[RemoteOK] API failed: ${e?.message || e}`);
      console.warn(chalk.yellow(`  ⚠ [RemoteOK] API failed, falling back to HTML: ${e?.message || e}`));
    }

    if (jobs.length === 0) {
      await this.initialize();
      const page = await this.createPage();
      try {
        for (let p = 1; p <= pages; p++) {
          const url = `https://remoteok.com/remote-jobs?search=${encodeURIComponent(query)}&location=usa&page=${p}`;
          console.log(chalk.dim(`  [RemoteOK] page ${p} → ${url}`));
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(this.config.timeout, 20000) });
          await this.sleep(800);

          const $ = cheerio.load(await page.content());
          const countBefore = jobs.length;
          const rows = $('tr.job, tr[data-id], tr[data-href], tr[data-url]');

          rows.each((_, el) => {
            const $el = $(el);
            let href = $el.attr('data-href') || $el.attr('data-url') || $el.find('a[href*="/remote-jobs/"]').first().attr('href') || '';
            if (!href) { fc.n++; return; }
            let jobUrl = href.startsWith('http') ? href : `https://remoteok.com${href.startsWith('/') ? '' : '/'}${href}`;
            jobUrl = jobUrl.split('#')[0];
            if (seen.has(jobUrl)) return;
            seen.add(jobUrl);

            const title = cleanHtml($el.find('h2, [itemprop="title"], .position').first().html() || '').trim();
            const company = cleanHtml($el.find('h3, .company, .companyLink h3, [itemprop="name"]').first().html() || '').trim();
            if (!title || !company) { fc.n++; return; }

            const location = cleanHtml($el.find('.location, [class*="location"]').first().html() || 'Remote, USA').trim() || 'Remote, USA';
            const salary = cleanHtml($el.find('.salary, [class*="salary"]').first().html() || '');
            const tags = $el.find('.tags a, .tag').map((_, t) => $(t).text().trim()).get().filter(Boolean);
            const logo = $el.find('img.logo, img').first().attr('src') || '';
            const postedDate = $el.find('time').first().attr('datetime') || '';
            const descHtml = $el.find('.expanded td, .description, .markdown, [itemprop="description"]').first().html() || '';
            const description = descHtml ? cleanDescription(cleanHtml(descHtml)) : '';

            this.pushIfValid(jobs, buildJob({
              title, company, location, salary, description, url: jobUrl,
              source: 'RemoteOK', postedDate, categories: tags, companyLogo: logo,
            }), fc);
          });
          console.log(chalk.gray(`     → page ${p}: kept=${jobs.length} filtered=${fc.n} new=${jobs.length - countBefore}`));
        }
      } catch (e: any) {
        errors.push(`[RemoteOK] HTML fallback failed: ${e?.message || e}`);
        console.error(chalk.red(`  ✖ [RemoteOK] HTML fallback failed: ${e?.message || e}`));
      } finally {
        await page.close().catch(() => { });
        await this.close();
      }
    }

    if (jobs.length === 0) {
      errors.push('[RemoteOK] no jobs extracted from API or HTML fallback');
    }

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
        // Use a faster navigation strategy and shorter timeout to avoid long waits
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(this.config.timeout, 20000) });
        // wait briefly for the page script to hydrate the data attribute (if needed)
        await page.waitForSelector('[id^="WaasLandingPage-react-component-"]', { timeout: Math.min(8000, this.config.timeout) }).catch(() => { });
        await this.sleep(Math.max(500, Math.floor(this.config.delay / 2)));

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
  async scrape(query: string, pages = 1): Promise<ScraperResult> {
    const t0 = Date.now(); const jobs: Job[] = []; const errors: string[] = []; const fc = { n: 0 };
    await this.initialize();
    const page = await this.createPage();
    try {
      for (let p = 1; p <= pages; p++) {
        const url = `https://talent.hubstaff.com/search/jobs?search%5Bkeywords%5D=${encodeURIComponent(query)}&search%5Bremote%5D=1&search%5Blocation%5D=United+States&page=${p}`;
        console.log(chalk.dim(`  [Hubstaff] page ${p} → ${url}`));
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(this.config.timeout, 25000) });
        await this.sleep(1000);
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
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });

        await page
          .waitForSelector('mat-card.mat-card', { timeout: 12000 })
          .catch(() => { });
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
    const seenUrls = new Set<string>();

    for (let p = 0; p < pages; p++) {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=United%20States&geoId=${geoId}&f_WT=2&start=${p * 25}`;
      console.log(chalk.dim(`  [LinkedIn] page ${p + 1} → ${url}`));

      try {
        const html = await httpsGetWithRetry(url, 15000, 2);
        const $ = cheerio.load(html);
        const cards = $('li, .base-search-card, [data-entity-urn]');
        let newOnPage = 0;

        cards.each((_, el) => {
          const $el = $(el);
          const title = cleanHtml(
            $el.find('h3.base-search-card__title').first().html() ||
            $el.find('[class*="job-title"]').first().html() ||
            $el.find('a.base-card__full-link').first().attr('aria-label') ||
            ''
          ).trim();

          const company = cleanHtml(
            $el.find('h4.base-search-card__subtitle a').first().html() ||
            $el.find('h4.base-search-card__subtitle').first().html() ||
            $el.find('[class*="company"]').first().html() ||
            ''
          ).trim();

          const location = cleanHtml(
            $el.find('span.job-search-card__location').first().html() ||
            $el.find('[class*="location"]').first().html() ||
            'Remote, United States'
          ).trim() || 'Remote, United States';

          let href =
            $el.find('a.base-card__full-link').first().attr('href') ||
            $el.find('a[href*="/jobs/view/"]').first().attr('href') ||
            '';
          if (href && href.includes('?')) href = href.split('?')[0];
          if (!href) { fc.n++; return; }
          const jobUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
          if (seenUrls.has(jobUrl)) return;
          seenUrls.add(jobUrl);

          const postedDate =
            $el.find('time.job-search-card__listdate').first().attr('datetime') ||
            $el.find('time').first().attr('datetime') || '';
          const logo = $el.find('img.artdeco-entity-image').first().attr('data-delayed-url') || $el.find('img').first().attr('src') || '';

          this.pushIfValid(jobs, buildJob({
            title, company, location, url: jobUrl, source: 'LinkedIn', postedDate, companyLogo: logo,
          }), fc);
          newOnPage++;
        });

        console.log(chalk.gray(`     → page ${p + 1}: kept=${jobs.length} filtered=${fc.n} new=${newOnPage}`));
        if (newOnPage === 0) {
          console.log(chalk.dim(`  [LinkedIn] no results on page ${p + 1}, stopping`));
          break;
        }
      } catch (e: any) {
        const msg = `[LinkedIn] page ${p + 1}: ${e?.message || e}`;
        errors.push(msg);
        console.warn(chalk.yellow(`  ⚠ ${msg}`));
        if (p === 0) break;
      }

      if (p < pages - 1) await this.sleep(900 + Math.floor(Math.random() * 500));
    }

    return { source: 'LinkedIn', jobs, scrapedAt: new Date().toISOString(), durationMs: Date.now() - t0, errors, filtered: fc.n };
  }
}


interface IJobService {
  saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{
    added: number;
    duplicates: number;
    skipped: number;
    descriptionUpdated: number;
  }>;
  cleanupBadDescriptions(): Promise<{ updated: number; cleared: number }>;
}

type ScrapeJobConfig = {
  source: string;
  scraper: JobBoardScraper;
  query: string;
  pages?: number;
};

function normalizeSourceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class ScraperManager {
  private config: ScraperOptions;
  private processor: JobProcessor;

  constructor(
    _container: any,
    _cache: any,
    private jobService: IJobService,
    config: ScraperOptions = {}
  ) {
    this.config = config;
    this.processor = new JobProcessor(this.jobService, this.config);
  }

  protected getScrapeJobs(): ScrapeJobConfig[] {
    const jobs: ScrapeJobConfig[] = [
      { source: 'We Work Remotely', scraper: new WeWorkRemotelyScraper(this.config), query: 'developer', pages: 2 },
      { source: 'RemoteOK', scraper: new RemoteOKScraper(this.config), query: 'developer', pages: 1 },
      { source: 'Remotive', scraper: new RemotiveScraper(this.config), query: 'engineer', pages: 1 },
      { source: 'Y Combinator', scraper: new YCombinatorScraper(this.config), query: 'software', pages: 1 },
      { source: 'Hubstaff Talent', scraper: new HubstaffTalentScraper(this.config), query: 'developer', pages: 1 },
      { source: 'SkipTheDrive', scraper: new SkipTheDriveScraper(this.config), query: 'developer', pages: 1 },
      { source: 'RemoteHub', scraper: new RemoteHubScraper(this.config), query: 'developer', pages: 1 },
      { source: 'LinkedIn', scraper: new LinkedInScraper(this.config), query: 'software engineer', pages: 2 },
    ];

    if (process.env.ENABLE_EXPERIMENTAL_SOURCES === 'true') {
      jobs.splice(4, 0, { source: 'NoDesk', scraper: new NoDeskScraper(this.config), query: 'remote', pages: 1 });
    }

    return jobs;
  }

  private findScrapeJob(source: string): ScrapeJobConfig | null {
    const requested = normalizeSourceName(source);

    return this.getScrapeJobs().find(job => {
      const displayName = normalizeSourceName(job.source);
      const className = normalizeSourceName((job.scraper as any).constructor?.name ?? '').replace(/scraper$/, '');
      return displayName === requested || className === requested;
    }) ?? null;
  }

  private getSourceHealth(result: ScraperResult, processed: JobProcessResult): SourceHealth {
    if (result.errors.length > 0 || processed.dbErrors > 0) return 'DEGRADED';
    if (result.jobs.length === 0) return 'DEGRADED';
    if (processed.found > 0 && processed.found === processed.skipped && processed.added === 0 && processed.duplicates === 0) return 'DEGRADED';
    if (processed.found > 0 && processed.enrichmentFailed >= Math.ceil(processed.found * 0.75)) return 'DEGRADED';
    if (processed.warnings.some(w => !w.startsWith('enrichment_capped:'))) return 'DEGRADED';
    return 'OK';
  }

  private iconForHealth(health: SourceHealth): string {
    if (health === 'OK') return chalk.green('OK');
    if (health === 'DEGRADED') return chalk.yellow('DEGRADED');
    return chalk.red('FAILED');
  }

  private printSourceSummary(source: string, result: ScraperResult, processed: JobProcessResult, health: SourceHealth): void {
    const skipSummary = compactRecord(processed.skipReasons);
    const extractionSummary = compactRecord(processed.extractionMethods);
    const validated = Math.max(0, result.jobs.length - processed.skipped);
    const newJobsPct = processed.added === 0 ? 0 : Math.round((processed.added / Math.max(1, result.jobs.length)) * 100);

    console.log(chalk.green(
      `  ✔ ${source}: health=${health} found=${result.jobs.length} new=${processed.added} existing=${processed.duplicates} rejected=${processed.filtered + processed.skipped} enriched=${processed.enriched}/${processed.enriched + processed.enrichmentFailed + (processed.extractionMethods['enrichment:disabled'] ?? 0)} avgChars=${processed.avgDescriptionChars} time=${formatMs(result.durationMs)}`
    ));

    if (skipSummary !== '-') console.log(chalk.gray(`     skip reasons: ${skipSummary}`));
    if (processed.warnings.length > 0) console.log(chalk.yellow(`     quality warnings: ${processed.warnings.join(', ')}`));
    if (extractionSummary !== '-') console.log(chalk.gray(`     extraction: ${extractionSummary}`));
    console.log(chalk.gray(`     source ROI: ${source}: ${result.jobs.length} found → ${processed.added} new = ${newJobsPct}%`));
    if (processed.duplicates > 0) console.log(chalk.gray(`     ${source}: ${processed.duplicates} existing jobs refreshed`));
    if (result.errors.length > 0) result.errors.forEach(e => console.warn(chalk.yellow(`     source warning: ${e}`)));
  }

  private async runScrapeJob(job: ScrapeJobConfig): Promise<ScrapeRunResult> {
    const { scraper, query, pages, source } = job;
    const name = (scraper as any).constructor?.name ?? source;
    console.log(chalk.blue(`\n▶ ${name}  query="${query}"  pages=${pages ?? 1}`));

    try {
      const result = await scraper.scrape(query, pages);
      const processed = await this.processor.process(result.jobs, result.source);
      const health = this.getSourceHealth(result, processed);

      this.printSourceSummary(result.source, result, processed, health);

      return {
        source: result.source,
        jobsFound: result.jobs.length,
        jobsAdded: processed.added,
        jobsDuplicate: processed.duplicates,
        jobsFiltered: processed.filtered,
        jobsSkipped: processed.skipped,
        jobsValidated: Math.max(0, result.jobs.length - processed.skipped),
        enriched: processed.enriched,
        enrichmentFailed: processed.enrichmentFailed,
        avgDescriptionChars: processed.avgDescriptionChars,
        descriptionUpdated: processed.descriptionUpdated,
        status: 'SUCCESS',
        health,
        errors: result.errors,
        warnings: processed.warnings,
        skipReasons: processed.skipReasons,
        extractionMethods: processed.extractionMethods,
        quality: processed.quality,
        dbErrors: processed.dbErrors,
        duration: result.durationMs,
      };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(chalk.red(`  ✖ ${name} failed: ${msg}`));

      return {
        source,
        jobsFound: 0,
        jobsAdded: 0,
        jobsDuplicate: 0,
        jobsFiltered: 0,
        jobsSkipped: 0,
        jobsValidated: 0,
        enriched: 0,
        enrichmentFailed: 0,
        avgDescriptionChars: 0,
        descriptionUpdated: 0,
        status: 'FAILED',
        health: 'FAILED',
        error: msg,
        errors: [msg],
        warnings: [],
        skipReasons: {},
        extractionMethods: {},
        quality: {
          badDescriptions: 0,
          missingCompany: 0,
          missingLocation: 0,
          enrichmentFailures: 0,
          warningRate: 0,
          rejectionRate: 0,
          duplicateRate: 0,
        },
        dbErrors: isDbError(msg) ? 1 : 0,
        duration: 0,
      };
    }
  }

  private getRunHealth(results: ScrapeRunResult[]): RunHealth {
    if (results.length === 0) return 'FAILED';
    const failed = results.filter(r => r.health === 'FAILED').length;
    const degraded = results.filter(r => r.health === 'DEGRADED').length;
    const completed = results.filter(r => r.status === 'SUCCESS' && r.jobsFound > 0).length;

    if (completed === 0) return 'FAILED';
    if (failed > 0 || degraded > 0 || results.some(r => r.dbErrors > 0)) return 'DEGRADED';
    return 'OK';
  }

  private printRunSummary(results: ScrapeRunResult[]): void {
    const totalFound = results.reduce((s, r) => s + r.jobsFound, 0);
    const totalAdded = results.reduce((s, r) => s + r.jobsAdded, 0);
    const totalDup = results.reduce((s, r) => s + r.jobsDuplicate, 0);
    const totalFiltered = results.reduce((s, r) => s + r.jobsFiltered, 0);
    const totalSkipped = results.reduce((s, r) => s + r.jobsSkipped, 0);
    const totalEnriched = results.reduce((s, r) => s + r.enriched, 0);
    const totalEnrichFailed = results.reduce((s, r) => s + r.enrichmentFailed, 0);
    const totalEnrichDisabled = results.reduce((s, r) => s + (r.extractionMethods['enrichment:disabled'] ?? 0), 0);
    const totalDbErrors = results.reduce((s, r) => s + r.dbErrors, 0);
    const sourceFailures = results.filter(r => r.health === 'FAILED').length;
    const degradedSources = results.filter(r => r.health === 'DEGRADED').length;
    const health = this.getRunHealth(results);

    const title = health === 'OK'
      ? chalk.green('OK')
      : health === 'DEGRADED'
        ? chalk.yellow('DEGRADED')
        : chalk.red('FAILED');

    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║ SCRAPE RUN SUMMARY                           ║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝'));
    console.log(`Status: ${title}`);
    if (health === 'DEGRADED') console.log(chalk.yellow('Reason: one or more sources had quality, network, or DB warnings'));
    if (health === 'FAILED') console.log(chalk.red('Reason: no usable scrape results were produced'));
    console.log('');
    console.log(`Sources attempted: ${results.length}`);
    console.log(`Sources failed:    ${sourceFailures}`);
    console.log(`Sources degraded:  ${degradedSources}`);
    console.log(`Jobs found:        ${totalFound}`);
    console.log(`New jobs added:          ${totalAdded}`);
    console.log(`Existing jobs refreshed: ${totalDup}`);
    console.log(`Rejected by validation/filtering: ${totalFiltered + totalSkipped}`);
    console.log(`Filtered:                ${totalFiltered}`);
    console.log(`Skipped:                 ${totalSkipped}`);
    console.log(`Enrichment:              ${totalEnriched}/${totalEnriched + totalEnrichFailed + totalEnrichDisabled}`);
    console.log(`DB errors:               ${totalDbErrors}`);

    console.log(chalk.cyan('\n┌──────────────────────┬──────────┬───────┬───────┬───────┬──────┬──────────┬────────┬────────┐'));
    console.log(chalk.cyan('│ Source               │ Health   │ Found │ Added │ Dup   │ Skip │ Enrich   │ AvgChr │ Time   │'));
    console.log(chalk.cyan('├──────────────────────┼──────────┼───────┼───────┼───────┼──────┼──────────┼────────┼────────┤'));
    for (const r of results) {
      const healthCell = r.health === 'OK' ? 'OK' : r.health === 'DEGRADED' ? 'WARN' : 'FAIL';
      const enrichDenominator = r.enriched + r.enrichmentFailed + (r.extractionMethods['enrichment:disabled'] ?? 0);
      const line = `│ ${pad(truncateCell(r.source, 20), 20)} │ ${pad(healthCell, 8)} │ ${pad(r.jobsFound, 5, 'right')} │ ${pad(r.jobsAdded, 5, 'right')} │ ${pad(r.jobsDuplicate, 5, 'right')} │ ${pad(r.jobsSkipped, 4, 'right')} │ ${pad(`${r.enriched}/${enrichDenominator}`, 8)} │ ${pad(r.avgDescriptionChars, 6, 'right')} │ ${pad(formatMs(r.duration), 6)} │`;
      if (r.health === 'OK') console.log(chalk.green(line));
      else if (r.health === 'DEGRADED') console.log(chalk.yellow(line));
      else console.log(chalk.red(line));
    }
    console.log(chalk.cyan('└──────────────────────┴──────────┴───────┴───────┴───────┴──────┴──────────┴────────┴────────┘'));

    const qualityWarnings = results
      .filter(r => r.warnings.length > 0 || r.errors.length > 0 || r.error)
      .map(r => ({ source: r.source, warnings: [...r.warnings, ...r.errors, ...(r.error ? [r.error] : [])] }));

    const aggregateSkipReasons: Record<string, number> = {};
    for (const r of results) {
      for (const [reason, count] of Object.entries(r.skipReasons || {})) {
        if (!count) continue;
        aggregateSkipReasons[reason] = (aggregateSkipReasons[reason] ?? 0) + count;
      }
    }

    const topReasons = ['missing_us_signal', 'non_us_restricted', 'description_too_short', 'description_missing_job_keywords'];
    const topReasonLines = topReasons
      .filter(reason => aggregateSkipReasons[reason])
      .map(reason => `- ${reason}: ${aggregateSkipReasons[reason]}`);

    if (topReasonLines.length > 0) {
      console.log(chalk.cyan('\nTop rejection reasons:'));
      topReasonLines.forEach(line => console.log(chalk.cyan(line)));
    }

    if (qualityWarnings.length > 0) {
      console.log(chalk.yellow('\nQUALITY / INFRA WARNINGS'));
      for (const item of qualityWarnings) {
        console.log(chalk.yellow(`- ${item.source}: ${item.warnings.slice(0, 3).join(' | ')}`));
      }
    }

    const weakSources = results.filter(r => r.jobsFound > 0 && r.enrichmentFailed > r.enriched);
    if (weakSources.length > 0) {
      console.log(chalk.yellow('\nWEAK EXTRACTION SOURCES'));
      weakSources.forEach(r => console.log(chalk.yellow(`- ${r.source}: ${r.enrichmentFailed} enrichment failures vs ${r.enriched} successes`)));
    }

    console.log('');
  }

  async runAll(): Promise<ScrapeRunResult[]> {
    const results: ScrapeRunResult[] = [];

    for (const scrapeJob of this.getScrapeJobs()) {
      results.push(await this.runScrapeJob(scrapeJob));
    }

    this.printRunSummary(results);
    return results;
  }

  async runOne(source: string): Promise<ScrapeRunResult> {
    const match = this.findScrapeJob(source);

    if (!match) {
      return {
        source,
        jobsFound: 0,
        jobsAdded: 0,
        jobsDuplicate: 0,
        jobsFiltered: 0,
        jobsSkipped: 0,
        jobsValidated: 0,
        enriched: 0,
        enrichmentFailed: 0,
        avgDescriptionChars: 0,
        descriptionUpdated: 0,
        status: 'FAILED',
        health: 'FAILED',
        error: `Unknown scraper source: ${source}`,
        errors: [`Unknown scraper source: ${source}`],
        warnings: [],
        skipReasons: {},
        extractionMethods: {},
        quality: {
          badDescriptions: 0,
          missingCompany: 0,
          missingLocation: 0,
          enrichmentFailures: 0,
          warningRate: 0,
          rejectionRate: 0,
          duplicateRate: 0,
        },
        dbErrors: 0,
        duration: 0,
      };
    }

    return this.runScrapeJob(match);
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

  console.log(chalk.cyan('Starting scrape run across 9 job boards...\n'));
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
          errorMessage: r.error ?? (r.errors.length ? r.errors.join(' | ').slice(0, 1000) : null),
          durationMs: r.duration,
        },
      })
    );
    const logResults = await Promise.allSettled(logInserts);
    const written = logResults.filter(r => r.status === 'fulfilled').length;
    const failedLogs = logResults.length - written;
    if (failedLogs > 0) {
      console.warn(chalk.yellow(`  ⚠ Wrote ${written}/${results.length} ScrapeLog entries (${failedLogs} failed)`));
    } else {
      console.log(chalk.dim(`  📋 Wrote ${written} ScrapeLog entries`));
    }

  } finally {
    await Promise.allSettled([
      db.$disconnect(),
      cache.disconnect().catch(() => { }),
    ]);
    console.log(chalk.dim('\n  Connections closed'));
  }

  const totalTime = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  console.log(chalk.gray(`
Total runtime: ${totalTime} minutes`));

  const failed = results.filter(r => r.health === 'FAILED');
  const degraded = results.filter(r => r.health === 'DEGRADED');
  const dbErrors = results.reduce((sum, r) => sum + r.dbErrors, 0);

  if (failed.length > 0 || degraded.length > 0 || dbErrors > 0) {
    console.log(chalk.bold.yellow('\n⚠ Done with issues — review warnings above.\n'));
  } else {
    console.log(chalk.bold.cyan('\n✅ Done — scrape completed successfully.\n'));
  }
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