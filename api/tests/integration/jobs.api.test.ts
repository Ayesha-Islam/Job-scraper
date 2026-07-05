import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import { createTestContainer } from '../helpers/create-test-container';

describe('Jobs API routes', () => {
    let container: ReturnType<typeof createTestContainer>;
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        container = createTestContainer();
        app = createTestApp(container);

        container.jobController.getJobs.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    data: [{ id: 'job_1', position: 'Backend Engineer' }],
                    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
                },
            });
        });

        container.jobController.searchJobs.mockImplementation((req, res) => {
            if (!req.query.q) {
                res.status(400).json({ success: false, error: 'Search query (q) is required' });
                return;
            }

            res.json({
                success: true,
                data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
                meta: { query: req.query.q },
            });
        });

        container.jobController.getJobById.mockImplementation((req, res) => {
            if (req.params.id === 'missing') {
                res.status(404).json({ success: false, error: 'Job not found' });
                return;
            }

            res.json({
                success: true,
                data: { id: req.params.id, position: 'Backend Engineer' },
            });
        });
    });

    it('GET /api/v1/jobs', async () => {
        const res = await request(app).get('/api/v1/jobs').expect(200);

        expect(container.jobController.getJobs).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
        expect(res.body.data.data[0].id).toBe('job_1');
    });

    it('GET /api/v1/jobs/search?q=react', async () => {
        const res = await request(app).get('/api/v1/jobs/search?q=react').expect(200);

        expect(container.jobController.searchJobs).toHaveBeenCalledTimes(1);
        expect(res.body.meta.query).toBe('react');
    });

    it('GET /api/v1/jobs/search without q returns 400', async () => {
        const res = await request(app).get('/api/v1/jobs/search').expect(400);

        expect(res.body).toEqual({
            success: false,
            error: 'Search query (q) is required',
        });
    });

    it('GET /api/v1/jobs/:id', async () => {
        const res = await request(app).get('/api/v1/jobs/job_1').expect(200);

        expect(container.jobController.getJobById).toHaveBeenCalledTimes(1);
        expect(res.body.data.id).toBe('job_1');
    });

    it('GET /api/v1/jobs/:id returns 404', async () => {
        const res = await request(app).get('/api/v1/jobs/missing').expect(404);

        expect(res.body).toEqual({
            success: false,
            error: 'Job not found',
        });
    });
});