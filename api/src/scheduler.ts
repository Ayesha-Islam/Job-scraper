import cron from 'node-cron';
import { Container } from './container';
import { CacheService } from './cache';
import { JobService } from './services/job.svc';
import { ScraperManager } from './scrapers/manager';

export function setupScheduler(
  container: Container,
  cache: CacheService,
  jobService: JobService
) {
  const scraperManager = new ScraperManager(container, cache, jobService);

  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] Running scheduled scrape...');
    try {
      const results = await scraperManager.runAll();
      const totalAdded = results.reduce((sum, r) => sum + r.jobsAdded, 0);
      console.log(`✅ [CRON] Scrape complete: ${totalAdded} new jobs added`);
    } catch (error) {
      console.error('❌ [CRON] Scheduled scrape failed:', error);
    }
  });

  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 [CRON] Cleaning up old jobs...');
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await container.db.job.updateMany({
        where: { scrapedAt: { lt: thirtyDaysAgo } },
        data: { isActive: false },
      });
      console.log(`✅ [CRON] Marked ${result.count} old jobs as inactive`);
    } catch (error) {
      console.error('❌ [CRON] Cleanup failed:', error);
    }
  });

  console.log('✅ Scheduler configured:');
  console.log('   📅 Scraping: Every 30 minutes');
  console.log('   🧹 Cleanup: Daily at 2 AM');
}