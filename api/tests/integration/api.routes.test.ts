import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoutes } from '../../src/routes';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config';

function createTestApp(container: any) {
    const app = express();

    app.use(express.json());
    app.use(createRoutes(container));

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
            path: req.path,
        });
    });

    app.use((err: any, req: any, res: any, _next: any) => {
        res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Internal server error',
        });
    });

    return app;
}

function createContainer() {
    return {
        jobController: {
            getJobs: vi.fn(async (_req, res) => {
                res.json({
                    success: true,
                    data: {
                        data: [
                            {
                                id: 'job_1',
                                position: 'Backend Engineer',
                                company: 'Acme Inc',
                            },
                        ],
                        pagination: {
                            page: 1,
                            limit: 20,
                            total: 1,
                            totalPages: 1,
                        },
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                    },
                });
            }),

            searchJobs: vi.fn(async (req, res) => {
                if (!req.query.q) {
                    res.status(400).json({
                        success: false,
                        error: 'Search query (q) is required',
                    });
                    return;
                }

                res.json({
                    success: true,
                    data: {
                        data: [],
                        pagination: {
                            page: 1,
                            limit: 20,
                            total: 0,
                            totalPages: 0,
                        },
                    },
                    meta: {
                        query: req.query.q,
                        timestamp: new Date().toISOString(),
                    },
                });
            }),

            getJobById: vi.fn(async (req, res) => {
                if (req.params.id === 'missing') {
                    res.status(404).json({
                        success: false,
                        error: 'Job not found',
                    });
                    return;
                }

                res.json({
                    success: true,
                    data: {
                        id: req.params.id,
                        position: 'Backend Engineer',
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                    },
                });
            }),
        },

        statsController: {
            getStats: vi.fn(async (_req, res) => {
                res.json({
                    success: true,
                    data: {
                        total: 10,
                        addedToday: 2,
                        bySource: [{ source: 'RemoteOK', count: 5 }],
                        byType: [{ type: 'FULL_TIME', count: 10 }],
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                    },
                });
            }),
        },

        healthController: {
            check: vi.fn(async (_req, res) => {
                res.json({
                    success: true,
                    data: {
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        uptime: 123,
                        database: {
                            status: 'connected',
                        },
                        cache: {
                            status: 'connected',
                        },
                    },
                });
            }),

            checkDatabase: vi.fn(async (_req, res) => {
                res.json({
                    success: true,
                    data: {
                        status: 'connected',
                        timestamp: new Date().toISOString(),
                    },
                });
            }),

            checkRedis: vi.fn(async (_req, res) => {
                res.json({
                    success: true,
                    data: {
                        status: 'connected',
                        timestamp: new Date().toISOString(),
                    },
                });
            }),
        },

        adminController: {
            triggerScrape: vi.fn(),
            getScrapeLogs: vi.fn(),
            getScrapeStats: vi.fn(),
            clearCache: vi.fn(),
            getCacheStats: vi.fn(),
        },

        authController: {
            register: vi.fn(),
            login: vi.fn(),
            me: vi.fn(),
        },
    };
}

describe('API route wiring', () => {
    let container: ReturnType<typeof createContainer>;
    let app: express.Express;
    const adminEmail = 'admin@example.com';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_EMAILS = adminEmail;

        container = createContainer();
        app = createTestApp(container);
    });

    it('GET /api/v1/health routes to healthController.check', async () => {
        const res = await request(app)
            .get('/api/v1/health')
            .expect(200);

        expect(container.healthController.check).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('healthy');
    });

    it('GET /health also routes to healthController.check', async () => {
        const res = await request(app)
            .get('/health')
            .expect(200);

        expect(container.healthController.check).toHaveBeenCalledTimes(1);
        expect(res.body.data.status).toBe('healthy');
    });

    it('GET /api/v1/jobs routes to jobController.getJobs', async () => {
        const res = await request(app)
            .get('/api/v1/jobs?page=1&limit=20')
            .expect(200);

        expect(container.jobController.getJobs).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
        expect(res.body.data.data[0]).toMatchObject({
            id: 'job_1',
            position: 'Backend Engineer',
        });
    });

    it('GET /api/v1/jobs/search routes to jobController.searchJobs', async () => {
        const res = await request(app)
            .get('/api/v1/jobs/search?q=react')
            .expect(200);

        expect(container.jobController.searchJobs).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
        expect(res.body.meta.query).toBe('react');
    });

    it('GET /api/v1/jobs/search returns 400 when q is missing', async () => {
        const res = await request(app)
            .get('/api/v1/jobs/search')
            .expect(400);

        expect(container.jobController.searchJobs).toHaveBeenCalledTimes(1);
        expect(res.body).toEqual({
            success: false,
            error: 'Search query (q) is required',
        });
    });

    it('GET /api/v1/jobs/:id routes to jobController.getJobById', async () => {
        const res = await request(app)
            .get('/api/v1/jobs/job_1')
            .expect(200);

        expect(container.jobController.getJobById).toHaveBeenCalledTimes(1);
        expect(res.body.data).toMatchObject({
            id: 'job_1',
            position: 'Backend Engineer',
        });
    });

    it('GET /api/v1/jobs/:id returns 404 when missing', async () => {
        const res = await request(app)
            .get('/api/v1/jobs/missing')
            .expect(404);

        expect(container.jobController.getJobById).toHaveBeenCalledTimes(1);
        expect(res.body).toEqual({
            success: false,
            error: 'Job not found',
        });
    });

    it('GET /api/v1/stats routes to statsController.getStats', async () => {
        const res = await request(app)
            .get('/api/v1/stats')
            .expect(200);

        expect(container.statsController.getStats).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
        expect(res.body.data.total).toBe(10);
    });

    it('GET /api/v1 returns API index', async () => {
        const res = await request(app)
            .get('/api/v1')
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            version: 'v1',
            health: '/api/v1/health',
            jobs: '/api/v1/jobs',
            jobSearch: '/api/v1/jobs/search',
            stats: '/api/v1/stats',
        });
    });

    it('GET unknown route returns 404', async () => {
        const res = await request(app)
            .get('/api/v1/unknown-route')
            .expect(404);

        expect(res.body).toEqual({
            success: false,
            error: 'Route not found',
            path: '/api/v1/unknown-route',
        });
    });

    it('GET /api/v1/admin/scrape returns 405 and points to POST endpoint', async () => {
        const token = jwt.sign(
            { id: 1, email: adminEmail },
            env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        const res = await request(app)
            .get('/api/v1/admin/scrape')
            .set('Authorization', `Bearer ${token}`)
            .expect(405);

        expect(res.body).toEqual({
            success: false,
            error: 'Method not allowed. Use POST /api/v1/admin/scrape.',
            example: {
                source: 'We Work Remotely',
            },
        });
    });
});
