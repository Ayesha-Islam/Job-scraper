import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Container } from './container';
import { CacheService } from './cache';
import { JobService } from './services/job.svc';
import { createRoutes } from './routes';
import chalk from 'chalk';

export function createApp() {
  const app = express();

  const container = Container.getInstance();
  const cache = new CacheService(container);
  const jobService = new JobService(container, cache);
  const pool = container.pool;

  app.use(helmet());
  
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (container.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(chalk.gray(`${req.method} ${req.path}`));
      next();
    });
  }

  const routes = createRoutes(container, cache, jobService, pool);
  app.use(routes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
    });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(chalk.red('Error:'), err);
    res.status(500).json({
      success: false,
      error: container.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  });

  return { app, container, cache, jobService };
}