import { Container } from '../container';
import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { WWRScraper } from './wwr';

async function runAllScrapers() {
  const container = Container.getInstance();
  
  try {
    const jobService = container.jobService;
    
    const wwrScraper = new WWRScraper(container);
    const wwrResult = await wwrScraper.scrapeAndSave(jobService);
    console.log(`WWR Results: Found ${wwrResult.jobsFound}, Added ${wwrResult.jobsAdded}`);

    const liScraper = new LinkedInScraper(container);
    const liResult = await liScraper.scrapeAndSave(jobService);
    console.log(`LinkedIn Results: Found ${liResult.jobsFound}, Added ${liResult.jobsAdded}`);

    const remScraper = new RemotiveScraper(container);
    const remResult = await remScraper.scrapeAndSave(jobService);
    console.log(`Remotive Results: Found ${remResult.jobsFound}, Added ${remResult.jobsAdded}`)

  } catch (error) {
    console.error('Fatal scraping error:', error);
  } finally {
    await container.close();
  }
}

runAllScrapers();