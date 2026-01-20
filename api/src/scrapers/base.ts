import puppeteer, { Browser, Page } from 'puppeteer';
import { Container } from '../container';
import { ScrapedJob, ScrapeResult, JobType } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { JobService } from '../services/job.svc';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import axios, { AxiosRequestConfig } from 'axios';
import chalk from 'chalk';

export interface ScraperConfig {
  name: string;
  url: string;
  maxRetries: number;
  timeout: number;
  useClaudeAPI: boolean;
  useBrowser?: boolean;
}

const DEBUG = process.env.DEBUG === 'true';

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

      console.log(chalk.cyan(`\n📋 ${this.config.name}: Processing ${jobs.length} jobs...`));

      if (DEBUG && jobs.length > 0) {
        console.log(chalk.gray('Sample job:'), JSON.stringify(jobs[0], null, 2));
      }

      const filtered = jobs.filter(job => {
        const isRemote = this.isRemoteUS(job);
        if (DEBUG && !isRemote) {
          console.log(chalk.red(`❌ Filtered out: ${job.position} - ${job.location}`));
        }
        return isRemote;
      });
      
      console.log(chalk.blue(`✓ ${filtered.length}/${jobs.length} jobs passed US Remote filter`));

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

        if (saveResults.added > 0) {
          console.log(chalk.green(`\n✨ ${saveResults.added} NEW JOBS SAVED:`));
          const displayCount = Math.min(saveResults.added, 5);
          filtered.slice(0, displayCount).forEach((job, index) => {
            console.log(chalk.white(`  ${index + 1}. ${chalk.bold(job.position)}`));
            console.log(chalk.gray(`     ${job.company} | ${job.location} | ${job.type}`));
          });
          if (saveResults.added > 5) {
            console.log(chalk.gray(`  ... and ${saveResults.added - 5} more`));
          }
        }

        if (saveResults.duplicates > 0) {
          console.log(chalk.yellow(`⚠️  ${saveResults.duplicates} duplicate jobs skipped`));
        }
      } else {
        console.log(chalk.yellow('⚠️  No jobs passed US Remote filter'));
        if (DEBUG && jobs.length > 0) {
          console.log(chalk.gray('Sample locations that were filtered:'));
          jobs.slice(0, 3).forEach(j => {
            console.log(chalk.gray(`  - ${j.position}: "${j.location}"`));
          });
        }
      }

      result.duration = Date.now() - startTime;
      await this.logToDb(result);
      return result;

    } catch (error) {
      result.status = 'FAILED';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;
      console.error(chalk.red(`❌ ${this.config.name} failed:`), error);
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
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu', 
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security', 
      ],
    });

    this.page = await this.browser.newPage();

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    this.page.setDefaultTimeout(this.config.timeout);
    
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  protected async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: this.config.timeout 
    });
  }

  protected async waitForSelector(selector: string, timeout = 5000): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.waitForSelector(selector, { timeout, visible: true });
      return true;
    } catch {
      return false;
    }
  }

  protected async autoScroll(scrollCount = 3, delayMs = 500): Promise<void> {
    if (!this.page) return;
    for (let i = 0; i < scrollCount; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.sleep(delayMs);
    }
  }

  protected async randomDelay(min = 500, max = 1500): Promise<void> {
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
        console.log(chalk.yellow(`⚠️  Retry ${this.retryCount}/${this.config.maxRetries}...`));
        await this.sleep(1000 * this.retryCount); // Reduced from 2000
        await this.cleanup();
        await this.initBrowser();
      }
    }
    return [];
  }
}