import { Container } from '../container';
import { CacheService } from '../cache';
import { JobService } from '../services/job.svc';
import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { WWRScraper } from './wwr';
import { ScrapeResult } from '../types';
import chalk from 'chalk';

export class ScraperManager {
  runOne(source: any) {
    throw new Error('Method not implemented.');
  }
  private scrapers: Array<LinkedInScraper | RemotiveScraper | WWRScraper>;

  constructor(
    private container: Container,
    private cache: CacheService,
    private jobService: JobService
  ) {
    this.scrapers = [
      new LinkedInScraper(container),
      new RemotiveScraper(container),
      new WWRScraper(container),
    ];
  }

  async runAll(): Promise<ScrapeResult[]> {
    this.printMainHeader();

    const startTime = Date.now();
    const results: ScrapeResult[] = [];

    for (let i = 0; i < this.scrapers.length; i++) {
      const scraper = this.scrapers[i];
      if (!scraper) continue;

      console.log(chalk.blue(`\n[${i + 1}/${this.scrapers.length}] Processing ${scraper['config'].name}...`));

      try {
        const result = await scraper.scrapeAndSave(this.jobService);
        results.push(result);

        console.log(chalk.green(`✓ Completed: ${result.jobsAdded} new jobs, ${result.jobsDuplicate} duplicates`));

        await this.logResult(result);

        if (i < this.scrapers.length - 1) {
          console.log(chalk.gray('\n⏳ Waiting 5 seconds before next scraper...'));
          await this.sleep(5000);
        }

      } catch (error) {
        console.error(chalk.red(`❌ Scraper failed: ${error}`));
        results.push({
          source: scraper['config'].name,
          jobsFound: 0,
          jobsAdded: 0,
          jobsDuplicate: 0,
          duration: 0,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printSummary(results, totalDuration);

    console.log(chalk.cyan('\n🗑️  Invalidating caches...'));
    await this.jobService.invalidateCaches();
    console.log(chalk.green('✓ Caches cleared\n'));

    return results;
  }

  private printMainHeader(): void {
    console.log('\n' + '═'.repeat(70));
    console.log(chalk.bold.magenta('  🎯 JOB SCRAPER ORCHESTRATION'));
    console.log('═'.repeat(70));
    console.log(chalk.gray(`  Started: ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`  Scrapers: ${this.scrapers.length} sources`));
    console.log('═'.repeat(70) + '\n');
  }

  private printSummary(results: ScrapeResult[], totalDuration: number): void {
    const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
    const totalAdded = results.reduce((sum, r) => sum + r.jobsAdded, 0);
    const totalDuplicates = results.reduce((sum, r) => sum + r.jobsDuplicate, 0);
    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    console.log('\n' + '═'.repeat(70));
    console.log(chalk.bold.green('  📊 SCRAPING SUMMARY'));
    console.log('═'.repeat(70));
    console.log(chalk.white(`  Total Duration: ${chalk.bold((totalDuration / 1000).toFixed(2) + 's')}`));
    console.log(chalk.white(`  Successful: ${chalk.green(successful.toString())} | Failed: ${chalk.red(failed.toString())}`));
    console.log(chalk.white(`  Jobs Found: ${chalk.bold(totalFound.toString())}`));
    console.log(chalk.white(`  New Jobs: ${chalk.bold.green(totalAdded.toString())}`));
    console.log(chalk.white(`  Duplicates: ${chalk.yellow(totalDuplicates.toString())}`));
    console.log('═'.repeat(70));

    console.log(chalk.yellow('\n📋 Breakdown by Source:\n'));
    results.forEach(r => {
      const status = r.status === 'SUCCESS' ? chalk.green('✓') : chalk.red('✗');
      const duration = (r.duration / 1000).toFixed(1);

      console.log(`${status} ${chalk.bold(r.source.padEnd(20))} | ` +
        `Found: ${String(r.jobsFound).padStart(3)} | ` +
        `Added: ${chalk.green(String(r.jobsAdded).padStart(3))} | ` +
        `Dupes: ${chalk.yellow(String(r.jobsDuplicate).padStart(3))} | ` +
        `${duration}s`
      );

      if (r.error) {
        console.log(chalk.red(`  └─ Error: ${r.error.substring(0, 100)}`));
      }
    });

    console.log('\n' + '═'.repeat(70) + '\n');

    if (totalAdded > 0) {
      console.log(chalk.green.bold(`🎉 Successfully added ${totalAdded} new remote jobs to database!\n`));
    } else if (totalFound > 0) {
      console.log(chalk.yellow(`ℹ️  Found ${totalFound} jobs but all were duplicates or filtered out\n`));
    } else {
      console.log(chalk.red(`⚠️  No jobs found. Check website structure or selectors\n`));
    }
  }


  private async logResult(result: ScrapeResult): Promise<void> {
    try {
      await this.container.db.scrapeLog.create({
        data: {
          source: result.source,
          status: result.status,
          jobsFound: result.jobsFound,
          jobsAdded: result.jobsAdded,
          errorMessage: result.error,
          durationMs: result.duration,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log result:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}