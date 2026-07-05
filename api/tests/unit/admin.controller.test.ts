import { beforeEach, describe, expect, it, vi } from 'vitest';

const scraperManagerMock = vi.hoisted(() => ({
    runAll: vi.fn(),
    runOne: vi.fn(),
}));

vi.mock('src/scrape', () => {
    return {
        ScraperManager: vi.fn(function MockScraperManager() {
            return scraperManagerMock;
        }),
    };
});
import { AdminController } from '../../src/controllers/admin.controller';

function createRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    };
}

function createScrapeResult(overrides: Record<string, unknown> = {}) {
    return {
        source: 'RemoteOK',
        jobsFound: 10,
        jobsAdded: 4,
        jobsDuplicate: 3,
        jobsFiltered: 2,
        jobsSkipped: 1,
        jobsValidated: 5,
        enriched: 3,
        enrichmentFailed: 1,
        avgDescriptionChars: 500,
        descriptionUpdated: 0,
        status: 'SUCCESS',
        health: 'OK',
        errors: [],
        warnings: [],
        skipReasons: {},
        extractionMethods: {},
        quality: {
            badDescriptions: 0,
            missingCompany: 0,
            missingLocation: 0,
            enrichmentFailures: 1,
            warningRate: 0,
            rejectionRate: 0,
            duplicateRate: 0,
        },
        dbErrors: 0,
        duration: 1000,
        ...overrides,
    };
}

describe('AdminController', () => {
    let container: any;
    let controller: AdminController;
    let res: ReturnType<typeof createRes>;
    let next: any;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        container = {
            cache: {
                deletePattern: vi.fn(),
            },
            jobService: {
                invalidateCaches: vi.fn(),
            },
            db: {
                scrapeLog: {
                    findMany: vi.fn(),
                    count: vi.fn(),
                },
                job: {
                    count: vi.fn(),
                },
            },
        };

        controller = new AdminController(container);
        res = createRes();
        next = vi.fn();
    });

    it('triggerScrape runs all sources when no source is provided', async () => {
        scraperManagerMock.runAll.mockResolvedValue([
            createScrapeResult({
                source: 'RemoteOK',
                jobsFound: 10,
                jobsAdded: 4,
                jobsDuplicate: 3,
                status: 'SUCCESS',
            }),
            createScrapeResult({
                source: 'LinkedIn',
                jobsFound: 5,
                jobsAdded: 1,
                jobsDuplicate: 2,
                status: 'FAILED',
            }),
        ]);

        const req: any = {
            body: {},
        };

        await controller.triggerScrape(req, res as any, next);

        expect(scraperManagerMock.runAll).toHaveBeenCalledTimes(1);
        expect(scraperManagerMock.runOne).not.toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: expect.any(Array),
                summary: {
                    totalFound: 15,
                    totalAdded: 5,
                    totalDuplicates: 5,
                    failed: 1,
                },
            },
        });
    });

    it('triggerScrape runs one source when source is provided', async () => {
        scraperManagerMock.runOne.mockResolvedValue(
            createScrapeResult({
                source: 'RemoteOK',
                jobsFound: 8,
                jobsAdded: 3,
                jobsDuplicate: 2,
                status: 'SUCCESS',
            })
        );

        const req: any = {
            body: {
                source: 'RemoteOK',
            },
        };

        await controller.triggerScrape(req, res as any, next);

        expect(scraperManagerMock.runOne).toHaveBeenCalledWith('RemoteOK');
        expect(scraperManagerMock.runAll).not.toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: [
                    expect.objectContaining({
                        source: 'RemoteOK',
                        jobsFound: 8,
                        jobsAdded: 3,
                        jobsDuplicate: 2,
                    }),
                ],
                summary: {
                    totalFound: 8,
                    totalAdded: 3,
                    totalDuplicates: 2,
                    failed: 0,
                },
            },
        });
    });

    it('triggerScrape passes errors to next', async () => {
        const error = new Error('scrape failed');
        scraperManagerMock.runAll.mockRejectedValue(error);

        const req: any = {
            body: {},
        };

        await controller.triggerScrape(req, res as any, next);

        expect(next).toHaveBeenCalledWith(error);
    });

    it('getScrapeLogs returns paginated logs', async () => {
        const logs = [
            {
                id: 'log_1',
                source: 'RemoteOK',
                status: 'SUCCESS',
                completedAt: new Date('2026-06-22T00:00:00.000Z'),
            },
        ];

        container.db.scrapeLog.findMany.mockResolvedValue(logs);
        container.db.scrapeLog.count.mockResolvedValue(41);

        const req: any = {
            query: {
                page: '2',
                limit: '20',
            },
        };

        await controller.getScrapeLogs(req, res as any, next);

        expect(container.db.scrapeLog.findMany).toHaveBeenCalledWith({
            skip: 20,
            take: 20,
            orderBy: {
                completedAt: 'desc',
            },
        });

        expect(container.db.scrapeLog.count).toHaveBeenCalledTimes(1);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                logs,
                pagination: {
                    page: 2,
                    limit: 20,
                    total: 41,
                    totalPages: 3,
                },
            },
        });
    });

    it('getScrapeLogs uses default pagination', async () => {
        container.db.scrapeLog.findMany.mockResolvedValue([]);
        container.db.scrapeLog.count.mockResolvedValue(0);

        const req: any = {
            query: {},
        };

        await controller.getScrapeLogs(req, res as any, next);

        expect(container.db.scrapeLog.findMany).toHaveBeenCalledWith({
            skip: 0,
            take: 20,
            orderBy: {
                completedAt: 'desc',
            },
        });

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                logs: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                },
            },
        });
    });

    it('getScrapeLogs passes errors to next', async () => {
        const error = new Error('db failed');
        container.db.scrapeLog.findMany.mockRejectedValue(error);
        container.db.scrapeLog.count.mockResolvedValue(0);

        const req: any = {
            query: {},
        };

        await controller.getScrapeLogs(req, res as any, next);

        expect(next).toHaveBeenCalledWith(error);
    });

    it('getScrapeStats returns last 24h stats and database total', async () => {
        const recentLogs = [
            {
                id: 'log_1',
                status: 'SUCCESS',
                jobsAdded: 4,
                durationMs: 1000,
                completedAt: new Date(),
            },
            {
                id: 'log_2',
                status: 'FAILED',
                jobsAdded: 0,
                durationMs: 3000,
                completedAt: new Date(),
            },
        ];

        container.db.scrapeLog.findMany.mockResolvedValue(recentLogs);
        container.db.job.count.mockResolvedValue(25);

        const req: any = {};

        await controller.getScrapeStats(req, res as any, next);

        expect(container.db.scrapeLog.findMany).toHaveBeenCalledWith({
            where: {
                completedAt: {
                    gte: expect.any(Date),
                },
            },
            orderBy: {
                completedAt: 'desc',
            },
        });

        expect(container.db.job.count).toHaveBeenCalledWith({
            where: {
                isActive: true,
            },
        });

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                last24Hours: {
                    totalRuns: 2,
                    successful: 1,
                    failed: 1,
                    successRate: '50.00%',
                    avgDuration: '2.00s',
                    totalJobsAdded: 4,
                },
                database: {
                    totalActiveJobs: 25,
                },
                recentRuns: recentLogs,
            },
        });
    });

    it('getScrapeStats handles no recent logs', async () => {
        container.db.scrapeLog.findMany.mockResolvedValue([]);
        container.db.job.count.mockResolvedValue(0);

        const req: any = {};

        await controller.getScrapeStats(req, res as any, next);

        expect(res.json).toHaveBeenCalledWith({
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
                database: {
                    totalActiveJobs: 0,
                },
                recentRuns: [],
            },
        });
    });

    it('getScrapeStats passes errors to next', async () => {
        const error = new Error('stats failed');
        container.db.scrapeLog.findMany.mockRejectedValue(error);
        container.db.job.count.mockResolvedValue(0);

        const req: any = {};

        await controller.getScrapeStats(req, res as any, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});