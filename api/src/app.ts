import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import container from './container';
import chalk from 'chalk';
import { createRoutes } from './routes';

const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? true
    : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(createRoutes(container));

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Job Scraper API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      stats: '/api/v1/stats',
      jobs: '/api/v1/jobs',
      search: '/api/v1/jobs/search',
      savedJobs: '/api/v1/saved-jobs',
      auth: '/api/v1/auth',
    },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(chalk.red('❌ Error:'), err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('⚠️  SIGTERM received, shutting down gracefully...'));
  await container.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(chalk.yellow('⚠️  SIGINT received, shutting down gracefully...'));
  await container.disconnect();
  process.exit(0);
});

export default app;