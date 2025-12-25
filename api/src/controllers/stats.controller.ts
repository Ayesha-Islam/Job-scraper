import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.svc';
import chalk from 'chalk';

export class StatsController {
  constructor(private jobService: JobService) {}

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log(chalk.cyan('📊 Fetching stats'));
      
      const stats = await this.jobService.getStats();

      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error fetching stats:'), error);
      next(error);
    }
  }
}