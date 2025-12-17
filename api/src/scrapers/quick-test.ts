import { Container } from '../container';
import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { WWRScraper } from './wwr';

async function testScraper(name: string) {
  const container = Container.getInstance();
  
let scraper: LinkedInScraper | RemotiveScraper | WWRScraper;
  if (name === 'linkedin') scraper = new LinkedInScraper(container);
  else if (name === 'remotive') scraper = new RemotiveScraper(container);
  else scraper = new WWRScraper(container);

  const jobs = await scraper.scrapeJobs();
  console.log(`\nTotal jobs scraped: ${jobs.length}`);
  
  const usRemote = jobs.filter(j => scraper.isRemoteUS(j));
  console.log(`US Remote jobs: ${usRemote.length}`);

  await container.close();
}

testScraper(process.argv[2] || 'remotive');