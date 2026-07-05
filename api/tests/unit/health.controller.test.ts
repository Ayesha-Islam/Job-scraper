import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../../src/controllers/health.controller';

function createRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    };
}

describe('HealthController', () => {
    let container: any;
    let controller: HealthController;
    let res: ReturnType<typeof createRes>;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(console, 'error').mockImplementation(() => { });

        container = {
            healthCheck: vi.fn(),
            db: {
                $queryRaw: vi.fn(),
            },
            cache: {
                ping: vi.fn(),
            },
        };

        controller = new HealthController(container);
        res = createRes();
    });

    it('returns healthy when DB and Redis are connected', async () => {
        container.healthCheck.mockResolvedValue({
            database: true,
            cache: true,
        });

        const req: any = {};

        await controller.check(req, res as any);

        expect(container.healthCheck).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                status: 'healthy',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                database: {
                    status: 'connected',
                },
                cache: {
                    status: 'connected',
                },
            },
        });
    });

    it('returns unhealthy when DB is disconnected', async () => {
        container.healthCheck.mockResolvedValue({
            database: false,
            cache: true,
        });

        const req: any = {};

        await controller.check(req, res as any);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                status: 'unhealthy',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                database: {
                    status: 'disconnected',
                },
                cache: {
                    status: 'connected',
                },
            },
        });
    });

    it('returns unhealthy when Redis is disconnected', async () => {
        container.healthCheck.mockResolvedValue({
            database: true,
            cache: false,
        });

        const req: any = {};

        await controller.check(req, res as any);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                status: 'unhealthy',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                database: {
                    status: 'connected',
                },
                cache: {
                    status: 'disconnected',
                },
            },
        });
    });

    it('returns 503 when general health check throws', async () => {
        container.healthCheck.mockRejectedValue(new Error('health failed'));

        const req: any = {};

        await controller.check(req, res as any);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Service unavailable',
            meta: {
                timestamp: expect.any(String),
            },
        });
    });

    it('checkDatabase returns connected when DB query succeeds', async () => {
        container.db.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

        const req: any = {};

        await controller.checkDatabase(req, res as any);

        expect(container.db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                status: 'connected',
                timestamp: expect.any(String),
            },
        });
    });

    it('checkDatabase returns 503 on DB failure', async () => {
        container.db.$queryRaw.mockRejectedValue(new Error('db down'));

        const req: any = {};

        await controller.checkDatabase(req, res as any);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Database unavailable',
            meta: {
                timestamp: expect.any(String),
            },
        });
    });

    it('checkRedis returns connected when Redis ping succeeds', async () => {
        container.cache.ping.mockResolvedValue('PONG');

        const req: any = {};

        await controller.checkRedis(req, res as any);

        expect(container.cache.ping).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                status: 'connected',
                timestamp: expect.any(String),
            },
        });
    });

    it('checkRedis returns 503 on Redis failure', async () => {
        container.cache.ping.mockRejectedValue(new Error('redis down'));

        const req: any = {};

        await controller.checkRedis(req, res as any);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Redis unavailable',
            meta: {
                timestamp: expect.any(String),
            },
        });
    });
});