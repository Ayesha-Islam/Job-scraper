import puppeteer, { Browser, Page } from 'puppeteer';
import { Container } from '../container';
import { ScrapedJob, ScrapeResult, JobType } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { JobService } from '../services/job.svc';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';

export interface ScraperConfig {
  name: string;
  url: string;
  maxRetries: number;
  timeout: number;
  useClaudeAPI: boolean;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected retryCount = 0;
  protected anthropic: Anthropic | null = null;
  protected lastJobs: ScrapedJob[] = [];

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

  public getLastJobs(): ScrapedJob[] {
    return this.lastJobs;
  }

  public clearLastJobs(): void {
    this.lastJobs = [];
  }

  protected computeHash(job: ScrapedJob): string {
    const key = `${job.url.toLowerCase()}:${job.position.toLowerCase()}`;
    return createHash('md5').update(key).digest('hex');
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
      console.log(`🚀 Starting ${this.config.name} scraper...`);
      await this.initBrowser();

      const jobs = await this.scrapeWithRetry();
      this.lastJobs = jobs;
      result.jobsFound = jobs.length;
      console.log(`📋 Found ${jobs.length} jobs from ${this.config.name}`);

      const filtered = jobs.filter(job => this.isRemoteUS(job));
      console.log(`✅ Filtered to ${filtered.length} US remote jobs`);

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

        console.log('💾 Saving jobs to database...');
        const { added, duplicates } = await jobService.saveJobs(createInputs);
        result.jobsAdded = added;
        result.jobsDuplicate = duplicates;
      } else {
        console.log('⚠️ No jobs to save for this source');
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.status = 'FAILED';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;
      console.error(`❌ ${this.config.name} scraper failed:`, result.error);
      return result;
    } finally {
      await this.cleanup();
    }
  }

  async scrape(): Promise<ScrapeResult> {
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
      console.log(`🚀 Starting ${this.config.name} scraper...`);
      await this.initBrowser();
      const jobs = await this.scrapeWithRetry();
      this.lastJobs = jobs;
      result.jobsFound = jobs.length;

      console.log(`📋 Found ${jobs.length} jobs from ${this.config.name}`);

      const filtered = jobs.filter(job => this.isRemoteUS(job));
      console.log(`✅ Filtered to ${filtered.length} US remote jobs`);

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.status = 'FAILED';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;
      console.error(`❌ ${this.config.name} scraper failed:`, result.error);
      return result;
    } finally {
      await this.cleanup();
    }
  }

  protected async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
        ],
        timeout: 30000,
      });

      this.page = await this.browser.newPage();

      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await this.page.setViewport({ width: 1920, height: 1080 });
      this.page.setDefaultTimeout(this.config.timeout);

      console.log(`✅ Browser initialized for ${this.config.name}`);
    } catch (error) {
      throw new Error(`Browser initialization failed: ${error}`);
    }
  }

  protected async navigateTo(url: string, maxRetries = 3): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized. Call initBrowser() first.');
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📡 Navigating to: ${url} (attempt ${attempt + 1}/${maxRetries})`);
        await this.page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        });
        console.log('✅ Navigation successful');
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Navigation attempt ${attempt + 1} failed: ${errorMsg}`);
        if (attempt === maxRetries - 1) {
          throw new Error(`Navigation failed after ${maxRetries} attempts: ${errorMsg}`);
        }
        console.log('⏳ Waiting 2 seconds before retry...');
        await this.sleep(2000);
      }
    }
  }

  protected async waitForSelector(selector: string, timeout = 10000): Promise<boolean> {
    if (!this.page) {
      console.warn('Page not initialized');
      return false;
    }

    try {
      console.log(`⏳ Waiting for selector: ${selector} (timeout: ${timeout}ms)`);
      await this.page.waitForSelector(selector, {
        timeout,
        visible: false,
      });
      console.log(`✅ Found element: ${selector}`);
      return true;
    } catch (error) {
      console.warn(`❌ Selector not found within ${timeout}ms: ${selector}`);
      return false;
    }
  }

  protected async autoScroll(scrollCount = 3, delayMs = 1000): Promise<void> {
    if (!this.page) {
      console.warn('Page not initialized');
      return;
    }

    try {
      console.log(`📜 Auto-scrolling ${scrollCount} times (${delayMs}ms delay)`);
      for (let i = 0; i < scrollCount; i++) {
        await this.page.evaluate(() => {
          (globalThis as any).scrollBy(0, window.innerHeight);
        });
        console.log(`   Scroll ${i + 1}/${scrollCount} complete`);
        await this.sleep(delayMs);
      }
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.sleep(500);
      console.log('✅ Auto-scroll complete');
    } catch (error) {
      console.warn('Auto-scroll failed:', error);
    }
  }

  protected randomDelay(min = 1000, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    console.log(`⏱️ Random delay: ${delay}ms`);
    return this.sleep(delay);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async scrapeWithRetry(): Promise<ScrapedJob[]> {
    while (this.retryCount < this.config.maxRetries) {
      try {
        return await this.scrapeJobs();
      } catch (error) {
        this.retryCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown';
        console.warn(`⚠️ Scrape attempt ${this.retryCount}/${this.config.maxRetries} failed: ${errorMsg}`);
        if (this.retryCount >= this.config.maxRetries) {
          throw new Error(`Max retries exceeded: ${errorMsg}`);
        }
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
        await this.cleanup();
        await this.initBrowser();
      }
    }
    throw new Error('Scrape failed after all retries');
  }

  protected async extractText(selector: string): Promise<string> {
    if (!this.page) return '';
    try {
      const element = await this.page.$(selector);
      if (!element) return '';
      const text = await this.page.evaluate(el => el.textContent, element);
      return text?.trim() || '';
    } catch {
      return '';
    }
  }

  protected async clickElement(selector: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.click(selector);
      return true;
    } catch {
      console.warn(`Failed to click: ${selector}`);
      return false;
    }
  }

  protected async elementExists(selector: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  protected async getElements(selector: string) {
    if (!this.page) return [];
    try {
      return await this.page.$$(selector);
    } catch {
      return [];
    }
  }

  protected async typeText(selector: string, text: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.type(selector, text, { delay: 100 });
      return true;
    } catch {
      console.warn(`Failed to type into: ${selector}`);
      return false;
    }
  }

  protected async screenshot(filename: string): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.screenshot({
        path: filename,
        fullPage: true,
      });
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.warn('Screenshot failed:', error);
    }
  }

  protected getCurrentUrl(): string {
    return this.page?.url() || '';
  }

  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  protected parseJobType(text: string): JobType {
    const lower = text.toLowerCase();
    if (lower.includes('contract')) return JobType.CONTRACT;
    if (lower.includes('part') && lower.includes('time')) return JobType.PART_TIME;
    if (lower.includes('intern')) return JobType.INTERNSHIP;
    return JobType.FULL_TIME;
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}