import { Container } from '../container';
import { LinkedInScraper } from './linkedin';
import { WWRScraper } from './wwr';
import { RemotiveScraper } from './remotive';
import { ScrapeResult } from '../types'; 
import chalk from 'chalk';

async function monitorScrapers() {
  const container = Container.getInstance();
  
  try {
    const jobService = container.jobService;
    console.log(chalk.bold.blue('\n🚀 INITIALIZING SCRAPER SUITE...'));

    const summary: ScrapeResult[] = [];

    const scrapers = [
      new WWRScraper(container),
      new LinkedInScraper(container),
      new RemotiveScraper(container)
    ];

    console.log(chalk.gray(`Found ${scrapers.length} scrapers to execute.\n`));
    console.log('─'.repeat(60));

    for (const scraper of scrapers) {
      try {
        console.log(chalk.yellow(`⏳ Running ${scraper.constructor.name}...`));
        
        const result: ScrapeResult = await scraper.scrapeAndSave(jobService);
        
        summary.push(result);

        const statusIcon = result.status === 'SUCCESS' ? chalk.green('✅') : chalk.red('❌');
        console.log(`${statusIcon} ${chalk.bold(result.source.padEnd(15))} | Found: ${result.jobsFound} | Added: ${chalk.green(result.jobsAdded)} | Duplicates: ${result.jobsDuplicate}`);
        
        if (result.error) {
          console.log(chalk.red(`   Error: ${result.error}`));
        }
      } catch (err) {
        console.error(chalk.red(`❌ Unexpected error in ${scraper.constructor.name}:`), err);
      }
      console.log('─'.repeat(60));
    }

    const totalFound = summary.reduce((acc, s) => acc + s.jobsFound, 0);
    const totalAdded = summary.reduce((acc, s) => acc + s.jobsAdded, 0);
    const totalDuration = summary.reduce((acc, s) => acc + s.duration, 0);

    console.log(chalk.bold.cyan('\n📊 FINAL RUN SUMMARY'));
    console.log(`Total Jobs Processed: ${totalFound}`);
    console.log(`New Jobs Added:      ${chalk.green(totalAdded)}`);
    console.log(`Total Duration:      ${(totalDuration / 1000).toFixed(2)}s`);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await container.db.scrapeLog.findMany({
      where: { completedAt: { gte: last24h } },
    });

    const successCount = recentLogs.filter(l => l.status === 'SUCCESS').length;
    console.log(`24h Success Rate:    ${recentLogs.length > 0 ? ((successCount / recentLogs.length) * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error(chalk.red('\n💥 Fatal Monitor Error:'), error);
  } finally {
    console.log(chalk.gray('\n⚠️  Closing container...'));
    await container.close();
    process.exit(0);
  }
}

monitorScrapers().catch(err => {
  console.error(err);
  process.exit(1);
});