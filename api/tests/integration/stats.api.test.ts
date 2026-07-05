import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import { createTestContainer } from '../helpers/create-test-container';

describe('Stats API routes', () => {
    let container: ReturnType<typeof createTestContainer>;
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        container = createTestContainer();
        app = createTestApp(container);

        container.statsController.getStats.mockImplementation((_req, res) => {
            res.json({
                success: true,
                data: {
                    total: 10,
                    addedToday: 2,
                    bySource: [{ source: 'RemoteOK', count: 5 }],
                    byType: [{ type: 'FULL_TIME', count: 10 }],
                },
            });
        });
    });

    it('GET /api/v1/stats', async () => {
        const res = await request(app).get('/api/v1/stats').expect(200);

        expect(container.statsController.getStats).toHaveBeenCalledTimes(1);
        expect(res.body.data.total).toBe(10);
    });

    it('GET /api/v1/stats/sources', async () => {
        const res = await request(app).get('/api/v1/stats/sources').expect(200);

        expect(container.statsController.getStats).toHaveBeenCalledTimes(1);
        expect(res.body.success).toBe(true);
    });
});