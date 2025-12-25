import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.svc';
import { JobFilters, JobType, ApiResponse, PaginatedResponse, Job } from '../types';
import chalk from 'chalk';

export class JobController {
  constructor(private jobService: JobService) { }

  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: JobFilters = {};

      if (req.query.search && typeof req.query.search === 'string') {
        filters.search = req.query.search.trim();
      }

      if (req.query.company && typeof req.query.company === 'string') {
        filters.company = req.query.company.trim();
      }

      if (req.query.location && typeof req.query.location === 'string') {
        filters.location = req.query.location.trim();
      }

      if (req.query.type && req.query.type !== 'ALL') {
        filters.type = req.query.type as JobType;
      }

      if (req.query.source && typeof req.query.source === 'string') {
        filters.source = req.query.source;
      }

      const sortBy = req.query.sortBy as string;
      filters.sortBy = (sortBy === 'recent' || sortBy === 'oldest' || sortBy === 'salary') 
        ? sortBy 
        : 'recent';

      const result = await this.jobService.getJobs(page, limit, filters);

      const response: ApiResponse<PaginatedResponse<Job>> = {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error) {
      console.error(chalk.red('❌ Error fetching jobs:'), error);
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const job = await this.jobService.getJobById(id);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      const response: ApiResponse<Job> = {
        success: true,
        data: job,
        meta: { timestamp: new Date().toISOString() }
      };

      res.json(response);
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

      const filters: JobFilters = {
        search: q.trim(),
        sortBy: 'recent'
      };

      const result = await this.jobService.getJobs(
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      const response: ApiResponse<PaginatedResponse<Job>> = {
        success: true,
        data: result,
        meta: {
          query: q,
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      console.error(chalk.red('❌ Error searching jobs:'), error);
      next(error);
    }
  }
}