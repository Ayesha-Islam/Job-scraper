import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { ScrapedJob, JobType } from '../types';
import chalk from 'chalk';

export class WWRScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'WeWorkRemotely',
      url: 'https://weworkremotely.com/categories/remote-programming-jobs',
      maxRetries: 3,
      timeout: 30000,
      useClaudeAPI: false,
    };
    super(container, config);
  }

  async scrapeJobs(): Promise<ScrapedJob[]> {
    if (!this.page) throw new Error('Page not initialized');

    const jobs: ScrapedJob[] = [];

    try {
      console.log(chalk.cyan('🔍 Navigating to WeWorkRemotely...'));

      await this.navigateTo(this.config.url);
      await this.randomDelay(2000, 3000);

      const hasJobs = await this.waitForSelector('li.feature, section.jobs', 10000);
      if (!hasJobs) {
        throw new Error('Job listings not found');
      }

      console.log(chalk.green('✓ Found job listings'));

      const jobsData = await this.page.evaluate(() => {
        const results: any[] = [];

        const jobElements = document.querySelectorAll('li.feature, section.jobs li');

        console.log(`
🔍 Debug Info:
  li.feature: ${document.querySelectorAll('li.feature').length}
  section.jobs li: ${document.querySelectorAll('section.jobs li').length}
  span.company: ${document.querySelectorAll('span.company').length}
  Elements with href: ${document.querySelectorAll('li a[href*="/remote-jobs/"]').length}
        `);

        jobElements.forEach((element) => {
          try {
            const linkEl = element.querySelector('a[href*="/remote-jobs/"], a[href*="/company/"]');
            if (!linkEl) return;

            let company = '';

            const linkText = linkEl.textContent || '';
            const linkTitle = (linkEl as HTMLAnchorElement).title || '';

            const href = (linkEl as HTMLAnchorElement).href;
            const urlMatch = href.match(/\/company\/([\w-]+)/);
            if (urlMatch) {
              company = urlMatch[1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }

            const companyEl = element.querySelector('span.company, .company-name, [class*="company"]');
            if (companyEl && companyEl.textContent?.trim()) {
              company = companyEl.textContent.trim();
            }

            const atMatch = linkText.match(/at\s+(.+?)(?:\s*\||$)/i);
            if (atMatch) {
              company = atMatch[1].trim();
            }

            const position = linkEl.textContent?.trim() || '';

            const regionEl = element.querySelector('.region, [class*="location"]');
            const location = regionEl?.textContent?.trim() || 'Anywhere';

            const url = href;

            const tagsEl = element.querySelector('.tags');
            const tags = tagsEl?.textContent?.trim() || '';

            if (position && url) {
              results.push({
                position,
                company: company || 'Remote Company',
                location,
                url,
                tags,
              });
            }
          } catch (err) {
            console.error('Error parsing WWR job:', err);
          }
        });

        return results;
      });

      console.log(chalk.cyan(`📋 Extracted ${jobsData.length} jobs from page`));

      for (const data of jobsData) {
        if (!data.position || data.position.length < 3) {
          console.log(chalk.gray(`  ↳ Skipping: No valid position title (${data.url})`));
          continue;
        }

        // Fixed: Create ScrapedJob with all required fields
        const job: ScrapedJob = {
          company: this.cleanText(data.company),
          position: this.cleanText(data.position),
          location: data.location || 'Remote',
          salary: null,
          type: this.parseJobType(data.tags),
          url: data.url,
          source: 'WeWorkRemotely',
          description: null,
        };

        jobs.push(job);
      }

      console.log(chalk.green(`✨ WeWorkRemotely scraping complete: ${jobs.length} jobs extracted`));
      return jobs;

    } catch (error) {
      throw new Error(`WeWorkRemotely scraping failed: ${error}`);
    }
  }

  isRemoteUS(job: ScrapedJob): boolean {
    const location = job.location?.toLowerCase() || '';

    const excluded = [
      'europe only',
      'eu only',
      'asia only',
      'uk only',
      'latin america only'
    ];

    const isExcluded = excluded.some(region => location.includes(region));

    return !isExcluded;
  }
}