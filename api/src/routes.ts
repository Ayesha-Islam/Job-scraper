import { Router } from 'express';
import { JobController, HealthController, AdminController } from './controllers';

export function createRoutes(
  jobController: JobController,
  healthController: HealthController,
  adminController: AdminController
): Router {
  const router = Router();

  // Health check
  router.get('/health', healthController.check.bind(healthController));

  // Job routes
  router.get('/api/v1/jobs', jobController.getJobs.bind(jobController));
  router.get('/api/v1/jobs/:id', jobController.getJobById.bind(jobController));
  router.get('/api/v1/stats', jobController.getStats.bind(jobController));

  // Admin routes
  router.post('/api/v1/admin/scrape', adminController.triggerScrape.bind(adminController));
  router.get('/api/v1/admin/scrape/logs', adminController.getScrapeLogs.bind(adminController));
  router.get('/api/v1/admin/scrape/stats', adminController.getScrapeStats.bind(adminController));

  return router;
}
