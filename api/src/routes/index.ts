import { Router } from 'express';
import { Container } from '../container';

export function createRoutes(container: Container): Router {
  const router = Router();

  const {
    jobController,
    statsController,
    healthController,
    adminController,
    authController
  } = container;

  const API_V1 = '/api/v1';

  // --- Public / System Routes ---
  router.get('/health', healthController.check.bind(healthController));
  router.get('/health/db', healthController.checkDatabase.bind(healthController));
  router.get('/health/redis', healthController.checkRedis.bind(healthController));

  // --- Auth Routes ---
  router.post(`${API_V1}/auth/register`, authController.register.bind(authController));
  router.post(`${API_V1}/auth/login`, authController.login.bind(authController));
  router.get(`${API_V1}/auth/me`, authController.me.bind(authController));

  // --- Job Routes ---
  router.get(`${API_V1}/jobs`, jobController.getJobs.bind(jobController));
  router.get(`${API_V1}/jobs/search`, jobController.searchJobs.bind(jobController));
  router.get(`${API_V1}/jobs/:id`, jobController.getJobById.bind(jobController));

  // --- Stats Routes ---
  router.get(`${API_V1}/stats`, statsController.getStats.bind(statsController));
  router.get(`${API_V1}/stats/sources`, statsController.getStats.bind(statsController));

  // --- Admin Routes ---
  router.post(`${API_V1}/admin/scrape`, adminController.triggerScrape.bind(adminController));
  router.get(`${API_V1}/admin/scrape/logs`, adminController.getScrapeLogs.bind(adminController));
  router.get(`${API_V1}/admin/scrape/stats`, adminController.getScrapeStats.bind(adminController));
  router.delete(`${API_V1}/admin/cache`, adminController.clearCache.bind(adminController));
  router.get(`${API_V1}/admin/cache/stats`, adminController.getCacheStats.bind(adminController));

  return router;
}