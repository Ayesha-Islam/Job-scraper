import { Container } from '../container';
import { CacheService } from '../cache/store';
import { JobService } from '../services/job.svc';
import { LinkedInScraper } from './linkedin';
import { WWRScraper } from './wwr';
import { RemotiveScraper } from './remotive';
import { ScrapeResult } from '../types';
import chalk from 'chalk';

export class ScraperManager {
  constructor(
    private container: Container,
    private cache: CacheService,
    private jobService: JobService
  ) {}

  async runAll(): Promise<ScrapeResult[]> {
    const startTime = Date.now();
    console.log(chalk.bold.blue('\n🚀 Starting parallel scraping...'));

    const scrapers = [
      new WWRScraper(this.container),
      new LinkedInScraper(this.container),
      new RemotiveScraper(this.container)
    ];

    const results = await Promise.allSettled(
      scrapers.map(scraper => 
        scraper.scrapeAndSave(this.jobService)
          .catch(error => {
            console.error(chalk.red(`${scraper.constructor.name} failed:`), error);
            return {
              source: scraper.constructor.name,
              jobsFound: 0,
              jobsAdded: 0,
              jobsDuplicate: 0,
              duration: 0,
              status: 'FAILED' as const,
              error: error.message
            };
          })
      )
    );

    const successfulResults: ScrapeResult[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        console.error(chalk.red(`Scraper ${index} rejected:`), result.reason);
      }
    });

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(chalk.green(`\n✅ Scraping completed in ${totalTime.toFixed(2)}s`));

    if (successfulResults.some(r => r.jobsAdded > 0)) {
      await this.jobService.invalidateCaches();
      console.log(chalk.gray('🔄 Caches invalidated'));
    }

    return successfulResults;
  }

  async runOne(scraperName: string): Promise<ScrapeResult> {
    console.log(chalk.blue(`\n🔧 Running ${scraperName} scraper...`));

    let scraper;
    switch (scraperName.toLowerCase()) {
      case 'wwr':
      case 'weworkremotely':
        scraper = new WWRScraper(this.container);
        break;
      case 'linkedin':
        scraper = new LinkedInScraper(this.container);
        break;
      case 'remotive':
        scraper = new RemotiveScraper(this.container);
        break;
      default:
        throw new Error(`Unknown scraper: ${scraperName}`);
    }

    const result = await scraper.scrapeAndSave(this.jobService);

    if (result.jobsAdded > 0) {
      await this.jobService.invalidateCaches();
    }

    return result;
  }
}