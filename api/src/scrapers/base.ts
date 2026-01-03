import puppeteer, { Browser, Page } from 'puppeteer';
import { Container } from '../container';
import { ScrapedJob, ScrapeResult, JobType } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { JobService } from '../services/job.svc';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import axios, { AxiosRequestConfig } from 'axios';

export interface ScraperConfig {
  name: string;
  url: string;
  maxRetries: number;
  timeout: number;
  useClaudeAPI: boolean;
  useBrowser?: boolean;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected retryCount = 0;
  protected anthropic: Anthropic | null = null;
  protected lastJobs: ScrapedJob[] = [];
  protected parseJobType(text: string): JobType {
    const lower = text.toLowerCase();
    if (lower.includes('contract')) return JobType.CONTRACT;
    if (lower.includes('part')) return JobType.PART_TIME;
    if (lower.includes('intern')) return JobType.INTERNSHIP;
    return JobType.FULL_TIME;
  }

  constructor(
    protected container: Container,
    protected config: ScraperConfig
  ) {
    if (config.useClaudeAPI && container.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: container.env.ANTHROPIC_API_KEY,
      });
    }
  }

  abstract scrapeJobs(): Promise<ScrapedJob[]>;
  abstract isRemoteUS(job: ScrapedJob): boolean;

  protected async fetchApi<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axios.get<T>(url, {
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...config?.headers,
      },
      ...config,
    });
    return response.data;
  }

  async scrapeAndSave(jobService: JobService): Promise<ScrapeResult> {
    const startTime = Date.now();
    const result: ScrapeResult = {
      source: this.config.name,
      jobsFound: 0,
      jobsAdded: 0,
      jobsDuplicate: 0,
      duration: 0,
      status: 'SUCCESS',
    };

    try {
      await this.initBrowser();
      const jobs = await this.scrapeWithRetry();

      this.lastJobs = jobs;
      result.jobsFound = jobs.length;

      const filtered = jobs.filter(job => this.isRemoteUS(job));

      if (filtered.length > 0) {
        const createInputs: Prisma.JobCreateInput[] = filtered.map(j => ({
          company: j.company,
          position: j.position,
          location: j.location ?? null,
          salary: j.salary ?? null,
          type: j.type,
          url: j.url,
          source: j.source,
          description: j.description ?? null,
          hash: this.computeHash(j),
        }));

        const saveResults = await jobService.saveJobs(createInputs);
        result.jobsAdded = saveResults.added;
        result.jobsDuplicate = saveResults.duplicates;
      }

      result.duration = Date.now() - startTime;
      await this.logToDb(result);
      return result;

    } catch (error) {
      result.status = 'FAILED';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;
      await this.logToDb(result);
      return result;
    } finally {
      await this.cleanup();
    }
  }

  protected async initBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.page = await this.browser.newPage();

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    this.page.setDefaultTimeout(this.config.timeout);
  }

  protected async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
  }


  protected async waitForSelector(selector: string, timeout = 10000): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.waitForSelector(selector, { timeout, visible: true });
      return true;
    } catch {
      return false;
    }
  }

  protected async autoScroll(scrollCount = 3, delayMs = 1000): Promise<void> {
    if (!this.page) return;
    for (let i = 0; i < scrollCount; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.sleep(delayMs);
    }
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.sleep(500);
  }

  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return this.sleep(delay);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  private async logToDb(result: ScrapeResult): Promise<void> {
    try {
      await this.container.db.scrapeLog.create({
        data: {
          source: result.source,
          status: result.status,
          jobsFound: result.jobsFound,
          jobsAdded: result.jobsAdded,
          durationMs: result.duration,
          errorMessage: result.error || null,
          completedAt: new Date(),
        }
      });
    } catch (e) {
      console.error('❌ Failed to log run to database:', e);
    }
  }

  protected computeHash(job: ScrapedJob): string {
    const key = `${job.url.toLowerCase()}:${job.position.toLowerCase()}`;
    return createHash('md5').update(key).digest('hex');
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  protected async screenshot(filename: string): Promise<void> {
    if (this.page) await this.page.screenshot({ path: filename });
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
    } finally {
      this.page = null;
      this.browser = null;
    }
  }

  protected async scrapeWithRetry(): Promise<ScrapedJob[]> {
    while (this.retryCount < this.config.maxRetries) {
      try {
        return await this.scrapeJobs();
      } catch (error) {
        this.retryCount++;
        if (this.retryCount >= this.config.maxRetries) throw error;
        await this.sleep(2000 * this.retryCount);
        await this.cleanup();
        await this.initBrowser();
      }
    }
    return [];
  }
}