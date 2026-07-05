import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import { createTestContainer } from '../helpers/create-test-container';

describe('Admin API routes', () => {
    let container: ReturnType<typeof createTestContainer>;
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        container = createTestContainer();
        app = createTestApp(container);

        container.adminController.triggerScrape.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    results: [],
                    summary: { totalFound: 0, totalAdded: 0, totalDuplicates: 0, failed: 0 },
                },
            });
        });

        container.adminController.getScrapeLogs.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    logs: [],
                    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                },
            });
        });

        container.adminController.getScrapeStats.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    last24Hours: {
                        totalRuns: 0,
                        successful: 0,
                        failed: 0,
                        successRate: 'N/A',
                        avgDuration: '0.00s',
                        totalJobsAdded: 0,
                    },
                    database: { totalActiveJobs: 0 },
                    recentRuns: [],
                },
            });
        });

        container.adminController.clearCache.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: { message: 'All caches cleared successfully' },
            });
        });

        container.adminController.getCacheStats.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    redis: { hits: 10, misses: 2, hitRate: '83.33%', totalKeys: 5 },
                },
            });
        });
    });

    it('POST /api/v1/admin/scrape', async () => {
        const res = await request(app)
            .post('/api/v1/admin/scrape')
            .send({ source: 'RemoteOK' })
            .expect(200);

        expect(container.adminController.triggerScrape).toHaveBeenCalledTimes(1);
        expect(res.body.data.summary.totalFound).toBe(0);
    });

    it('GET /api/v1/admin/scrape returns 405', async () => {
        const res = await request(app).get('/api/v1/admin/scrape').expect(405);

        expect(res.body.error).toBe('Method not allowed. Use POST /api/v1/admin/scrape.');
    });

    it('GET /api/v1/admin/scrape/logs', async () => {
        const res = await request(app).get('/api/v1/admin/scrape/logs').expect(200);

        expect(container.adminController.getScrapeLogs).toHaveBeenCalledTimes(1);
        expect(res.body.data.logs).toEqual([]);
    });

    it('GET /api/v1/admin/scrape/stats', async () => {
        const res = await request(app).get('/api/v1/admin/scrape/stats').expect(200);

        expect(container.adminController.getScrapeStats).toHaveBeenCalledTimes(1);
        expect(res.body.data.database.totalActiveJobs).toBe(0);
    });

    it('DELETE /api/v1/admin/cache', async () => {
        const res = await request(app).delete('/api/v1/admin/cache').expect(200);

        expect(container.adminController.clearCache).toHaveBeenCalledTimes(1);
        expect(res.body.data.message).toBe('All caches cleared successfully');
    });

    it('GET /api/v1/admin/cache/stats', async () => {
        const res = await request(app).get('/api/v1/admin/cache/stats').expect(200);

        expect(container.adminController.getCacheStats).toHaveBeenCalledTimes(1);
        expect(res.body.data.redis.totalKeys).toBe(5);
    });
});