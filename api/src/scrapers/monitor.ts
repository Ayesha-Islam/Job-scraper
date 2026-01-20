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
    const startTime = Date.now();

    const scrapers = [
      new WWRScraper(container),
      new LinkedInScraper(container),
      new RemotiveScraper(container)
    ];

    console.log(chalk.gray(`Found ${scrapers.length} scrapers to execute in parallel.\n`));
    console.log('─'.repeat(60));

    console.log(chalk.yellow('⚡ Running scrapers in parallel...'));
    
    const results = await Promise.allSettled(
      scrapers.map(scraper => scraper.scrapeAndSave(jobService))
    );

    results.forEach((result, index) => {
      const scraper = scrapers[index];
      
      if (result.status === 'fulfilled') {
        const scrapeResult = result.value;
        summary.push(scrapeResult);

        const statusIcon = scrapeResult.status === 'SUCCESS' ? chalk.green('✅') : chalk.red('❌');
        console.log(`${statusIcon} ${chalk.bold(scrapeResult.source.padEnd(15))} | Found: ${scrapeResult.jobsFound} | Added: ${chalk.green(scrapeResult.jobsAdded)} | Duplicates: ${scrapeResult.jobsDuplicate}`);
        
        if (scrapeResult.error) {
          console.log(chalk.red(`   Error: ${scrapeResult.error}`));
        }
      } else {
        console.error(chalk.red(`❌ ${scraper.constructor.name} failed:`), result.reason);
      }
      console.log('─'.repeat(60));
    });

    const totalTime = (Date.now() - startTime) / 1000;
    const totalFound = summary.reduce((acc, s) => acc + s.jobsFound, 0);
    const totalAdded = summary.reduce((acc, s) => acc + s.jobsAdded, 0);
    const totalDuplicates = summary.reduce((acc, s) => acc + s.jobsDuplicate, 0);

    console.log(chalk.bold.cyan('\n📊 FINAL RUN SUMMARY'));
    console.log(`Total Jobs Processed: ${totalFound}`);
    console.log(`New Jobs Added:      ${chalk.green(totalAdded)}`);
    console.log(`Duplicates:          ${chalk.yellow(totalDuplicates)}`);
    console.log(`Total Duration:      ${chalk.cyan(totalTime.toFixed(2) + 's')} ${chalk.gray('(parallel execution)')}`);

    const avgTimePerScraper = summary.length > 0 
      ? (summary.reduce((acc, s) => acc + s.duration, 0) / summary.length / 1000).toFixed(2)
      : 0;
    console.log(`Avg Time/Scraper:    ${avgTimePerScraper}s`);

    if (totalAdded === 0 && totalFound > 0) {
      console.log(chalk.yellow('\n⚠️  WARNING: No new jobs added!'));
      console.log(chalk.gray('Possible reasons:'));
      console.log(chalk.gray('  1. All jobs are duplicates (already in database)'));
      console.log(chalk.gray('  2. US Remote filter is too strict'));
      console.log(chalk.gray('  3. Run with DEBUG=true for detailed filtering logs'));
    }

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