import { Request, Response, NextFunction } from 'express';
import { JobService } from './services/job.svc';
import { JobType } from './types';
import { Container } from './container';

export class JobController {
  constructor(private jobService: JobService) {}

  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        company: req.query.company as string,
        location: req.query.location as string,
        type: req.query.type as JobType,
        source: req.query.source as string,
      };

      const result = await this.jobService.getJobs(page, limit, filters);

      res.json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await this.jobService.getJobById(req.params.id);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.jobService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export class AdminController {
  constructor(
    private container: Container,
    private jobService: JobService
  ) {}

  async triggerScrape(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { source } = req.body;

      const { ScraperManager } = await import('./scrapers/manager');
      const { CacheService } = await import('./cache');
      
      const cache = new CacheService(this.container);
      const manager = new ScraperManager(this.container, cache, this.jobService);

      let results;
      if (source) {
        const result = await manager.runOne(source);
        results = [result];
      } else {
        results = await manager.runAll();
      }

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalFound: results.reduce((sum, r) => sum + r.jobsFound, 0),
            totalAdded: results.reduce((sum, r) => sum + r.jobsAdded, 0),
            totalDuplicates: results.reduce((sum, r) => sum + r.jobsDuplicate, 0),
            failed: results.filter(r => r.status === 'FAILED').length,
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getScrapeLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

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
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getScrapeStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentLogs = await this.container.db.scrapeLog.findMany({
        where: { completedAt: { gte: last24h } },
        orderBy: { completedAt: 'desc' },
      });

      const successCount = recentLogs.filter((l: any) => l.status === 'SUCCESS').length;
      const totalCount = recentLogs.length;

      res.json({
        success: true,
        data: {
          last24Hours: {
            totalRuns: totalCount,
            successful: successCount,
            failed: totalCount - successCount,
            successRate: totalCount > 0 ? (successCount / totalCount * 100).toFixed(2) + '%' : 'N/A',
            totalJobsAdded: recentLogs.reduce((sum: number, l: any) => sum + l.jobsAdded, 0),
          },
          recentRuns: recentLogs.slice(0, 10),
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}