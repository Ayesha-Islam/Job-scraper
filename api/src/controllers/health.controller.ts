import { Request, Response } from 'express';
import chalk from 'chalk';
import { Container } from '../container';

export class HealthController {
  constructor(private container: Container) {}

  async check(req: Request, res: Response): Promise<void> {
    try {
      await this.container.db.$queryRaw`SELECT 1`;
      
      await this.container.redis.ping();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: 'connected',
          redis: 'connected',
        },
      });
    } catch (error) {
      console.error(chalk.red('❌ Health check failed:'), error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable',
      });
    }
  }


  async checkDatabase(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.container.db.$queryRaw`SELECT 1 as health`;
      res.json({
        status: 'ok',
        database: 'connected',
        result,
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }


  async checkRedis(req: Request, res: Response): Promise<void> {
    try {
      const pong = await this.container.redis.ping();
      res.json({
        status: 'ok',
        redis: 'connected',
        response: pong,
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        redis: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
