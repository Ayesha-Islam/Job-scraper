import cron from 'node-cron';
import { Container } from './container';
import { ScraperManager } from './scrapers/manager';
import chalk from 'chalk';

let isRunning = false;
let lastRunTime: Date | null = null;
let nextRunTime: Date | null = null;

export function setupScheduler() {
  const container = Container.getInstance();
  
  const scraperManager = new ScraperManager(
    container,
    container.cache,
    container.jobService
  );

  const calculateNextRun = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    
    if (now.getHours() >= 2) {
      next.setDate(next.getDate() + 1);
    }
    
    nextRunTime = next;
    return next;
  };

  calculateNextRun();

  // Run every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    if (isRunning) {
      console.log(chalk.yellow('⚠️  Scraper already running, skipping...'));
      return;
    }

    console.log(chalk.blue('\n⏰ ====== SCHEDULED SCRAPE ======'));
    console.log(chalk.gray(`Started: ${new Date().toLocaleString()}`));
    isRunning = true;
    lastRunTime = new Date();
    const startTime = Date.now();
    
    try {
      const results = await scraperManager.runAll();
      
      const totalTime = (Date.now() - startTime) / 1000;
      const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
      const totalAdded = results.reduce((sum, r) => sum + r.jobsAdded, 0);
      const totalDuplicates = results.reduce((sum, r) => sum + r.jobsDuplicate, 0);
      
      console.log(chalk.green('\n✅ SCRAPE COMPLETED'));
      console.log(chalk.white(`Found: ${totalFound} | Added: ${chalk.green(totalAdded)} | Duplicates: ${totalDuplicates} | Time: ${totalTime.toFixed(2)}s`));
      
      results.forEach(r => {
        const status = r.status === 'SUCCESS' ? '✓' : '✗';
        console.log(`  ${status} ${r.source.padEnd(20)} ${r.jobsAdded} new`);
      });
      
      calculateNextRun();
      console.log(chalk.blue(`\n📅 Next run: ${nextRunTime?.toLocaleString()}`));
      
    } catch (error) {
      console.error(chalk.red('\n❌ SCRAPE FAILED'), error);
    } finally {
      isRunning = false;
    }
  });

  console.log(chalk.green('✅ Scheduler ready'));
  console.log(chalk.cyan(`📅 Next run: ${nextRunTime?.toLocaleString()}`));
}

export async function manualScrape() {
  if (isRunning) {
    throw new Error('Scraping already in progress');
  }

  const container = Container.getInstance();
  const scraperManager = new ScraperManager(
    container,
    container.cache,
    container.jobService
  );

  console.log(chalk.blue('\n🚀 Manual scrape started...'));
  isRunning = true;
  
  try {
    const results = await scraperManager.runAll();
    console.log(chalk.green('\n✅ Manual scrape completed'));
    return results;
  } finally {
    isRunning = false;
  }
}

export function getSchedulerStatus() {
  return { isRunning, lastRunTime, nextRunTime };
}