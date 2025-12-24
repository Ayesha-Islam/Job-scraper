import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.svc';
import { JobType } from '../types';
import chalk from 'chalk';

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

      console.log(chalk.cyan(`📋 Fetching jobs: page=${page}, limit=${limit}`));

      const result = await this.jobService.getJobs(page, limit, filters);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error fetching jobs:'), error);
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      console.log(chalk.cyan(`🔍 Fetching job: ${id}`));

      const job = await this.jobService.getJobById(id);

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
      console.error(chalk.red('❌ Error fetching job:'), error);
      next(error);
    }
  }

  async searchJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
        return;
      }

      console.log(chalk.cyan(`🔍 Searching jobs: "${q}"`));

      const filters = {
        company: q,
        location: undefined,
        type: undefined,
        source: undefined,
      };

      const result = await this.jobService.getJobs(
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      res.json({
        success: true,
        data: result,
        meta: {
          query: q,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Error searching jobs:'), error);
      next(error);
    }
  }
}
