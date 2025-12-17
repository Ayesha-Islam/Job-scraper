import { Container } from '../container';
import { CacheService } from '../cache';
import { JobService } from '../services/job.svc';
import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { WWRScraper } from './wwr';
import { ScraperManager } from './manager';

async function main() {
  const container = Container.getInstance();
  const cache = new CacheService(container);
  const jobService = new JobService(container, cache);

  const action = process.argv[2];

  try {
    switch (action) {
      case 'all': {
        const manager = new ScraperManager(container, cache, jobService);
        await manager.runAll();
        break;
      }

      case 'linkedin': {
        const scraper = new LinkedInScraper(container);
        const result = await scraper.scrape();
        console.log('Result:', result);
        break;
      }

      case 'remotive': {
        const scraper = new RemotiveScraper(container);
        const result = await scraper.scrape();
        console.log('Result:', result);
        break;
      }

      case 'wwr': {
        const scraper = new WWRScraper(container);
        const result = await scraper.scrape();
        console.log('Result:', result);
        break;
      }

      default:
        console.log('Usage: npm run scrape [all|linkedin|remotive|wwr]');
        break;
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    cache.destroy();
    await container.close();
  }
}

main();