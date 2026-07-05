import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobController } from '../../src/controllers/job.controller';

function createRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    };
}

describe('JobController', () => {
    let jobService: any;
    let controller: JobController;
    let res: ReturnType<typeof createRes>;
    let next: any;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        jobService = {
            getJobs: vi.fn(),
            getJobById: vi.fn(),
        };

        controller = new JobController(jobService);
        res = createRes();
        next = vi.fn();
    });

    it('GET jobs parses page, limit, search, source, type, and valid sortBy', async () => {
        jobService.getJobs.mockResolvedValue({
            data: [],
            pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
        });

        const req: any = {
            query: {
                page: '2',
                limit: '10',
                search: 'react',
                company: 'Acme',
                location: 'Remote',
                type: 'FULL_TIME',
                source: 'RemoteOK',
                sortBy: 'oldest',
            },
        };

        await controller.getJobs(req, res as any, next);

        expect(jobService.getJobs).toHaveBeenCalledWith(2, 10, {
            search: 'react',
            company: 'Acme',
            location: 'Remote',
            type: 'FULL_TIME',
            source: 'RemoteOK',
            sortBy: 'oldest',
        });

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.any(Object),
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            })
        );
    });

    it('GET jobs defaults page=1, limit=20, sortBy=recent', async () => {
        jobService.getJobs.mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        const req: any = { query: {} };

        await controller.getJobs(req, res as any, next);

        expect(jobService.getJobs).toHaveBeenCalledWith(1, 20, {
            sortBy: 'recent',
        });
    });

    it('GET jobs invalid sortBy falls back to recent', async () => {
        jobService.getJobs.mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        const req: any = {
            query: {
                sortBy: 'random',
            },
        };

        await controller.getJobs(req, res as any, next);

        expect(jobService.getJobs).toHaveBeenCalledWith(1, 20, {
            sortBy: 'recent',
        });
    });

    it('GET jobs ignores type=ALL', async () => {
        jobService.getJobs.mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        const req: any = {
            query: {
                type: 'ALL',
            },
        };

        await controller.getJobs(req, res as any, next);

        expect(jobService.getJobs).toHaveBeenCalledWith(1, 20, {
            sortBy: 'recent',
        });
    });

    it('searchJobs requires q', async () => {
        const req: any = {
            query: {},
        };

        await controller.searchJobs(req, res as any, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Search query (q) is required',
        });
        expect(jobService.getJobs).not.toHaveBeenCalled();
    });

    it('searchJobs calls getJobs with q and recent sort', async () => {
        jobService.getJobs.mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        const req: any = {
            query: {
                q: 'node',
                page: '3',
                limit: '5',
            },
        };

        await controller.searchJobs(req, res as any, next);

        expect(jobService.getJobs).toHaveBeenCalledWith(3, 5, {
            search: 'node',
            sortBy: 'recent',
        });

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                meta: expect.objectContaining({
                    query: 'node',
                    timestamp: expect.any(String),
                }),
            })
        );
    });

    it('getJobById returns 404 when job is missing', async () => {
        jobService.getJobById.mockResolvedValue(null);

        const req: any = {
            params: {
                id: 'missing_id',
            },
        };

        await controller.getJobById(req, res as any, next);

        expect(jobService.getJobById).toHaveBeenCalledWith('missing_id');
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Job not found',
        });
    });

    it('getJobById returns job when found', async () => {
        const job = {
            id: 'job_1',
            position: 'Backend Engineer',
        };

        jobService.getJobById.mockResolvedValue(job);

        const req: any = {
            params: {
                id: 'job_1',
            },
        };

        await controller.getJobById(req, res as any, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: job,
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            })
        );
    });

    it('passes errors to next in getJobs', async () => {
        const error = new Error('service failed');
        jobService.getJobs.mockRejectedValue(error);

        const req: any = { query: {} };

        await controller.getJobs(req, res as any, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});