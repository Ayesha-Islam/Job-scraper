import cron from 'node-cron';
import { Container } from './container';
import { ScraperManager } from './scrapers/manager';
import chalk from 'chalk';

export function setupScheduler() {
  const container = Container.getInstance();
  
  const scraperManager = new ScraperManager(
    container,
    container.cache,
    container.jobService
  );

  cron.schedule('0 2 * * *', async () => {
    console.log(chalk.blue('\n⏰ Scheduled scrape started...'));
    try {
      const results = await scraperManager.runAll();
      console.log(chalk.green('✅ Scheduled scrape completed'));
      
      const totalAdded = results.reduce((sum, r) => sum + r.jobsAdded, 0);
      console.log(chalk.cyan(`📊 Total jobs added: ${totalAdded}`));
    } catch (error) {
      console.error(chalk.red('❌ Scheduled scrape failed:'), error);
    }
  });

  console.log(chalk.green('✅ Scheduler initialized (runs daily at 2 AM)'));
}