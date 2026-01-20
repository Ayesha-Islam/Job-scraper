import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { ScrapedJob, JobType } from '../types';
import chalk from 'chalk';

export class WWRScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'WeWorkRemotely',
      url: 'https://weworkremotely.com/categories/remote-programming-jobs',
      maxRetries: 2, 
      timeout: 20000, 
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
      await this.sleep(1000); 

      const hasJobs = await this.waitForSelector('li.feature, section.jobs', 5000);
      if (!hasJobs) {
        throw new Error('Job listings not found');
      }

      const jobsData = await this.page.evaluate(() => {
        const results: any[] = [];
        const jobElements = document.querySelectorAll('li.feature, section.jobs li');

        jobElements.forEach((element) => {
          try {
            const linkEl = element.querySelector('a[href*="/remote-jobs/"], a[href*="/company/"]');
            if (!linkEl) return;

            let company = '';
            const href = (linkEl as HTMLAnchorElement).href;
            
            const urlMatch = href.match(/\/company\/([\w-]+)/);
            if (urlMatch) {
              company = urlMatch[1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }

            const companyEl = element.querySelector('span.company, .company-name');
            if (companyEl?.textContent?.trim()) {
              company = companyEl.textContent.trim();
            }

            const linkText = linkEl.textContent || '';
            const atMatch = linkText.match(/at\s+(.+?)(?:\s*\||$)/i);
            if (atMatch) {
              company = atMatch[1].trim();
            }

            const position = linkEl.textContent?.trim() || '';
            const regionEl = element.querySelector('.region, [class*="location"]');
            const location = regionEl?.textContent?.trim() || 'Anywhere';
            const tagsEl = element.querySelector('.tags');
            const tags = tagsEl?.textContent?.trim() || '';

            if (position && href && position.length >= 3) {
              results.push({
                position,
                company: company || 'Remote Company',
                location,
                url: href,
                tags,
              });
            }
          } catch (err) {
            console.error('Error parsing job:', err);
          }
        });

        return results;
      });

      console.log(chalk.cyan(`📋 Extracted ${jobsData.length} jobs`));

      for (const data of jobsData) {
        jobs.push({
          company: this.cleanText(data.company),
          position: this.cleanText(data.position),
          location: data.location || 'Remote',
          salary: null,
          type: this.parseJobType(data.tags),
          url: data.url,
          source: 'WeWorkRemotely',
          description: null,
        });
      }

      return jobs;
    } catch (error) {
      throw new Error(`WeWorkRemotely scraping failed: ${error}`);
    }
  }

  isRemoteUS(job: ScrapedJob): boolean {
    const loc = (job.location || '').toLowerCase();

    const excluded = [
      'europe only',
      'eu only',
      'asia only',
      'uk only',
      'latin america only'
    ];

    return !excluded.some(region => loc.includes(region));
  }
}