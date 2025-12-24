import { Router } from 'express';
import { Container } from '../container';
import { CacheService } from '../cache';
import { JobService } from '../services/job.svc';
import { JobController } from '../controllers/job.controller';
import { StatsController } from '../controllers/stats.controller';
import { HealthController } from '../controllers/health.controller';
import { AdminController } from '../controllers/admin.controller';
import { Pool } from 'pg';
import { AuthController } from '../controllers/auth.controller';

export function createRoutes(
  container: Container,
  cache: CacheService,
  jobService: JobService,
  pool: Pool
): Router {
  const router = Router();

  const jobController = new JobController(jobService);
  const statsController = new StatsController(jobService);
  const healthController = new HealthController(container);
  const adminController = new AdminController(container, cache, jobService);
  const authController = new AuthController(pool);

  router.get('/health', healthController.check.bind(healthController));
  router.get('/health/db', healthController.checkDatabase.bind(healthController));
  router.get('/health/redis', healthController.checkRedis.bind(healthController));

  router.post('/api/v1/auth/register', authController.register.bind(authController));
  router.post('/api/v1/auth/login', authController.login.bind(authController));
  router.get('/api/v1/auth/me', authController.me.bind(authController));

  router.get('/api/v1/jobs', jobController.getJobs.bind(jobController));
  router.get('/api/v1/jobs/search', jobController.searchJobs.bind(jobController));
  router.get('/api/v1/jobs/:id', jobController.getJobById.bind(jobController));

  router.get('/api/v1/stats', statsController.getStats.bind(statsController));
  router.get('/api/v1/stats/sources', statsController.getSourceStats.bind(statsController));

  router.post('/api/v1/admin/scrape', adminController.triggerScrape.bind(adminController));
  router.get('/api/v1/admin/scrape/logs', adminController.getScrapeLogs.bind(adminController));
  router.get('/api/v1/admin/scrape/stats', adminController.getScrapeStats.bind(adminController));
  router.delete('/api/v1/admin/cache', adminController.clearCache.bind(adminController));
  router.get('/api/v1/admin/cache/stats', adminController.getCacheStats.bind(adminController));

  return router;
}