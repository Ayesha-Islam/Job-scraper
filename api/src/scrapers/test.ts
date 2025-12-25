import { Container } from '../container';
import { LinkedInScraper } from './linkedin';

async function test() {
  const container = Container.getInstance();
  
  try {
    const scraper = new LinkedInScraper(container);
    const result = await scraper.scrapeAndSave(container.jobService);
    
    console.log('\n✅ Test Results:');
    console.log(`Jobs Found: ${result.jobsFound}`);
    console.log(`Jobs Added: ${result.jobsAdded}`);
    console.log(`Duplicates: ${result.jobsDuplicate}`);
    console.log(`Status: ${result.status}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await container.close();
  }
}

test();