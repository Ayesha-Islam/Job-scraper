import { Request, Response, NextFunction } from 'express';
import { Container } from '../container';
import chalk from 'chalk';
import { ApiResponse } from '../types';
import { ScraperManager } from 'src/scrape';

export class AdminController {
  constructor(private container: Container) { }

  async triggerScrape(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { source } = req.body?.source ? { source: req.body.source } : {};

      console.log(chalk.blue('🚀 Manual scrape triggered...'));

      const manager = new ScraperManager(
        this.container,
        this.container.cache,
        this.container.jobService
      );

      let results;
      if (source) {
        console.log(chalk.cyan(`🎯 Running ${source} scraper only...`));
        const result = await manager.runOne(source);
        results = [result];
      } else {
        console.log(chalk.cyan('🎯 Running all scrapers...'));
        results = await manager.runAll();
      }

      const summary = {
        totalFound: results.reduce((sum, r) => sum + r.jobsFound, 0),
        totalAdded: results.reduce((sum, r) => sum + r.jobsAdded, 0),
        totalDuplicates: results.reduce((sum, r) => sum + r.jobsDuplicate, 0),
        failed: results.filter(r => r.status === 'FAILED').length,
      };

      res.json({
        success: true,
        data: {
          results,
          summary,
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Manual scrape failed:'), error);
      next(error);
    }
  }

  async getScrapeLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      console.log(chalk.cyan(`📋 Fetching scrape logs: page=${page}`));

      const [logs, total] = await Promise.all([
        this.container.db.scrapeLog.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { completedAt: 'desc' },
        }),
        this.container.db.scrapeLog.count(),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error fetching logs:'), error);
      next(error);
    }
  }

  async getScrapeStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log(chalk.cyan('📊 Fetching scrape statistics...'));

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [recentLogs, totalJobs] = await Promise.all([
        this.container.db.scrapeLog.findMany({
          where: { completedAt: { gte: last24h } },
          orderBy: { completedAt: 'desc' },
        }),
        this.container.db.job.count({ where: { isActive: true } }),
      ]);

      const successCount = recentLogs.filter(l => l.status === 'SUCCESS').length;
      const totalCount = recentLogs.length;
      const totalJobsAdded = recentLogs.reduce((sum, l) => sum + l.jobsAdded, 0);
      const avgDuration = recentLogs.length > 0
        ? recentLogs.reduce((sum, l) => sum + l.durationMs, 0) / recentLogs.length
        : 0;

      res.json({
        success: true,
        data: {
          last24Hours: {
            totalRuns: totalCount,
            successful: successCount,
            failed: totalCount - successCount,
            successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) + '%' : 'N/A',
            avgDuration: (avgDuration / 1000).toFixed(2) + 's',
            totalJobsAdded,
          },
          database: {
            totalActiveJobs: totalJobs,
          },
          recentRuns: recentLogs.slice(0, 10),
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error fetching scrape stats:'), error);
      next(error);
    }
  }

  async clearCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log(chalk.cyan('🗑️ Clearing all caches...'));
      await this.container.jobService.invalidateCaches();

      const response: ApiResponse = {
        success: true,
        data: { message: 'All caches cleared successfully' }
      };

      res.json(response);
    } catch (error) {
      console.error(chalk.red('❌ Error clearing cache:'), error);
      next(error);
    }
  }

  async getCacheStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log(chalk.cyan('📊 Fetching cache statistics...'));

      const redisInfo = await this.container.cache.info('stats');
      const hits = parseInt(redisInfo.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(redisInfo.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0';

      const keys = await this.container.cache.keys('*');

      res.json({
        success: true,
        data: {
          redis: {
            hits,
            misses,
            hitRate: hitRate + '%',
            totalKeys: keys.length,
          },
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error fetching cache stats:'), error);
      next(error);
    }
  }
}