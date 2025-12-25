import { Request, Response } from 'express';
import chalk from 'chalk';
import { Container } from '../container';
import { ApiResponse, HealthCheckResponse } from '../types';

export class HealthController {
  constructor(private container: Container) {}

  async check(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.container.healthCheck();
      
      const healthData: HealthCheckResponse = {
        status: (healthStatus.database && healthStatus.cache) ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: healthStatus.database ? 'connected' : 'disconnected',
        },
        cache: {
          status: healthStatus.cache ? 'connected' : 'disconnected',
        },
      };

      const response: ApiResponse<HealthCheckResponse> = {
        success: true,
        data: healthData
      };

      res.json(response);
    } catch (error) {
      console.error(chalk.red('❌ Health check failed:'), error);
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        meta: { timestamp: new Date().toISOString() }
      });
    }
  }

  async checkDatabase(req: Request, res: Response): Promise<void> {
    try {
      await this.container.db.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: {
          status: 'connected',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(chalk.red('❌ Database health check failed:'), error);
      res.status(503).json({
        success: false,
        error: 'Database unavailable',
        meta: { timestamp: new Date().toISOString() }
      });
    }
  }

  async checkRedis(req: Request, res: Response): Promise<void> {
    try {
      await this.container.cache.ping();
      res.json({
        success: true,
        data: {
          status: 'connected',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(chalk.red('❌ Redis health check failed:'), error);
      res.status(503).json({
        success: false,
        error: 'Redis unavailable',
        meta: { timestamp: new Date().toISOString() }
      });
    }
  }
}