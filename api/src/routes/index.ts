import { Router, Request, Response } from 'express';
import { Container } from '../container';
import { db } from '../lib/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware';
import { SavedJobController } from '../controllers/saved-job.controller';
import { SavedJobService } from '../services/saved-job.service';

export function createRoutes(container: Container): Router {
  const router = Router();
  const API_V1 = '/api/v1';

  const {
    jobController,
    statsController,
    healthController,
    adminController,
    authController,
  } = container;

  const savedJobController = new SavedJobController(new SavedJobService(db));

  router.get('/health', healthController.check.bind(healthController));
  router.get('/health/db', healthController.checkDatabase.bind(healthController));
  router.get('/health/redis', healthController.checkRedis.bind(healthController));

  router.get(`${API_V1}/health`, healthController.check.bind(healthController));
  router.get(`${API_V1}/health/db`, healthController.checkDatabase.bind(healthController));
  router.get(`${API_V1}/health/redis`, healthController.checkRedis.bind(healthController));

  router.get(`${API_V1}`, (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        version: 'v1',
        health: `${API_V1}/health`,
        jobs: `${API_V1}/jobs`,
        jobSearch: `${API_V1}/jobs/search`,
        savedJobs: {
          list: `GET ${API_V1}/saved-jobs`,
          save: `POST ${API_V1}/saved-jobs`,
          remove: `DELETE ${API_V1}/saved-jobs/:jobId`,
          check: `GET ${API_V1}/saved-jobs/check/:jobId`,
        },
        stats: `${API_V1}/stats`,
        auth: {
          register: `POST ${API_V1}/auth/register`,
          login: `POST ${API_V1}/auth/login`,
          me: `GET ${API_V1}/auth/me`,
        },
        admin: {
          scrape: `POST ${API_V1}/admin/scrape`,
          scrapeLogs: `GET ${API_V1}/admin/scrape/logs`,
          scrapeStats: `GET ${API_V1}/admin/scrape/stats`,
          clearCache: `DELETE ${API_V1}/admin/cache`,
          cacheStats: `GET ${API_V1}/admin/cache/stats`,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    });
  });

  router.post(`${API_V1}/auth/register`, authController.register.bind(authController));
  router.post(`${API_V1}/auth/login`, authController.login.bind(authController));
  router.get(`${API_V1}/auth/me`, requireAuth, authController.me.bind(authController));

  router.get(`${API_V1}/jobs`, jobController.getJobs.bind(jobController));
  router.get(`${API_V1}/jobs/search`, jobController.searchJobs.bind(jobController));
  router.get(`${API_V1}/jobs/:id`, jobController.getJobById.bind(jobController));

  router.post(`${API_V1}/saved-jobs`, requireAuth, savedJobController.saveJob.bind(savedJobController));
  router.get(`${API_V1}/saved-jobs`, requireAuth, savedJobController.getSavedJobs.bind(savedJobController));
  router.get(`${API_V1}/saved-jobs/check/:jobId`, requireAuth, savedJobController.isJobSaved.bind(savedJobController));
  router.delete(`${API_V1}/saved-jobs/:jobId`, requireAuth, savedJobController.removeSavedJob.bind(savedJobController));

  router.get(`${API_V1}/stats`, statsController.getStats.bind(statsController));
  router.get(`${API_V1}/stats/sources`, statsController.getStats.bind(statsController));

  router.post(
    `${API_V1}/admin/scrape`,
    requireAuth,
    requireAdmin,
    adminController.triggerScrape.bind(adminController)
  );
  router.get(`${API_V1}/admin/scrape`, requireAuth, requireAdmin, (_req: Request, res: Response) => {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST /api/v1/admin/scrape.',
      example: { source: 'We Work Remotely' },
    });
  });

  router.get(
    `${API_V1}/admin/scrape/logs`,
    requireAuth,
    requireAdmin,
    adminController.getScrapeLogs.bind(adminController)
  );
  router.get(
    `${API_V1}/admin/scrape/stats`,
    requireAuth,
    requireAdmin,
    adminController.getScrapeStats.bind(adminController)
  );
  router.delete(
    `${API_V1}/admin/cache`,
    requireAuth,
    requireAdmin,
    adminController.clearCache.bind(adminController)
  );
  router.get(
    `${API_V1}/admin/cache/stats`,
    requireAuth,
    requireAdmin,
    adminController.getCacheStats.bind(adminController)
  );

  return router;
}
