import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import { createTestContainer } from '../helpers/create-test-container';

describe('Health API routes', () => {
    let container: ReturnType<typeof createTestContainer>;
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        container = createTestContainer();
        app = createTestApp(container);

        container.healthController.check.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    database: { status: 'connected' },
                    cache: { status: 'connected' },
                },
            });
        });

        container.healthController.checkDatabase.mockImplementation((_req, res) => {
            res.json({ success: true, data: { status: 'connected' } });
        });

        container.healthController.checkRedis.mockImplementation((_req, res) => {
            res.json({ success: true, data: { status: 'connected' } });
        });
    });

    it('GET /health', async () => {
        const res = await request(app).get('/health').expect(200);

        expect(container.healthController.check).toHaveBeenCalledTimes(1);
        expect(res.body.data.status).toBe('healthy');
    });

    it('GET /api/v1/health', async () => {
        const res = await request(app).get('/api/v1/health').expect(200);

        expect(container.healthController.check).toHaveBeenCalledTimes(1);
        expect(res.body.data.status).toBe('healthy');
    });

    it('GET /api/v1/health/db', async () => {
        const res = await request(app).get('/api/v1/health/db').expect(200);

        expect(container.healthController.checkDatabase).toHaveBeenCalledTimes(1);
        expect(res.body.data.status).toBe('connected');
    });

    it('GET /api/v1/health/redis', async () => {
        const res = await request(app).get('/api/v1/health/redis').expect(200);

        expect(container.healthController.checkRedis).toHaveBeenCalledTimes(1);
        expect(res.body.data.status).toBe('connected');
    });
});