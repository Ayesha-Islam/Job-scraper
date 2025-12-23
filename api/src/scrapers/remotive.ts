import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { Job } from '../types';
import chalk from 'chalk';

export class RemotiveScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'Remotive',
      url: 'https://remotive.com/remote-jobs/software-dev',
      maxRetries: 3,
      timeout: 30000,
      useClaudeAPI: false,
    };
    super(container, config);
  }

  async scrapeJobs(): Promise<Job[]> {
    if (!this.page) throw new Error('Page not initialized');

    const jobs: Job[] = [];

    try {
      console.log(chalk.cyan('🔍 Fetching from Remotive...'));

      await this.navigateTo(this.config.url);
      await this.randomDelay(2000, 3000);

      const jobsExist = await this.waitForSelector('article.job-tile, .job-list-item, [class*="job"]', 10000);

      if (!jobsExist) {
        console.log(chalk.yellow('⚠️  No jobs found with standard selectors, trying alternative...'));

        await this.autoScroll(3, 1000);
        await this.sleep(2000);
      }

      const jobsData = await this.page.evaluate(() => {
        const results: any[] = [];

        const selectors = [
          'article.job-tile',
          '.job-list-item',
          '[class*="job-tile"]',
          'article[class*="job"]',
          'div[class*="job-item"]'
        ];

        let jobElements: NodeListOf<Element> | null = null;

        for (const selector of selectors) {
          jobElements = document.querySelectorAll(selector);
          if (jobElements.length > 0) {
            console.log(`Found ${jobElements.length} jobs with selector: ${selector}`);
            break;
          }
        }

        if (!jobElements || jobElements.length === 0) {
          return results;
        }

        jobElements.forEach((element) => {
          try {
            const titleEl = element.querySelector('[class*="title"], h2, h3, .job-title');
            const companyEl = element.querySelector('[class*="company"], .company-name');
            const locationEl = element.querySelector('[class*="location"], .location');
            const salaryEl = element.querySelector('[class*="salary"], .salary');
            const linkEl = element.querySelector('a');
            const tagsEl = element.querySelector('[class*="tags"], .tags');

            const position = titleEl?.textContent?.trim() || '';
            const company = companyEl?.textContent?.trim() || '';
            const location = locationEl?.textContent?.trim() || '';
            const salary = salaryEl?.textContent?.trim() || null;
            const tags = tagsEl?.textContent?.trim() || '';

            let url = '';
            if (linkEl) {
              const href = (linkEl as HTMLAnchorElement).href;
              url = href.startsWith('http') ? href : `https://remotive.com${href}`;
            }

            if (position && company && url) {
              results.push({
                position,
                company,
                location: location || 'Remote - Worldwide',
                salary,
                url,
                tags,
              });
            }
          } catch (err) {
            console.error('Error parsing job:', err);
          }
        });

        return results;
      });

      console.log(chalk.cyan(`📋 Extracted ${jobsData.length} jobs from page`));

      for (const data of jobsData) {
        const job: Job = {
          company: this.cleanText(data.company),
          position: this.cleanText(data.position),
          location: data.location || 'Remote - Worldwide',
          salary: data.salary,
          type: this.parseJobType(data.tags),
          url: data.url,
          source: 'Remotive',
        };

        jobs.push(job);
      }

      if (jobs.length === 0) {
        console.log(chalk.yellow('⚠️  No jobs found. Taking screenshot for debugging...'));
        await this.page.screenshot({ path: 'remotive-debug.png', fullPage: true });
        console.log(chalk.blue('📸 Screenshot saved: remotive-debug.png'));
      }

      console.log(chalk.green(`✨ Remotive scraping complete: ${jobs.length} jobs extracted`));
      return jobs;

    } catch (error) {
      console.error(chalk.red('❌ Remotive scrape failed:'), error);
      throw new Error(`Remotive scraping failed: ${error}`);
    }
  }

  isRemoteUS(job: Job): boolean {
    const location = job.location?.toLowerCase() || '';

    const isUSOrWorldwide =
      location.includes('united states') ||
      location.includes('usa') ||
      location.includes('us only') ||
      location.includes('us') ||
      location.includes('worldwide') ||
      location.includes('anywhere') ||
      location.includes('remote') ||
      location.includes('north america') ||
      location.includes('americas');

    const excludedRegions = [
      'europe only',
      'eu only',
      'asia only',
      'uk only',
      'canada only',
      'latam only',
      'africa only'
    ];

    const isExcluded = excludedRegions.some(region => location.includes(region));

    return isUSOrWorldwide && !isExcluded;
  }

}