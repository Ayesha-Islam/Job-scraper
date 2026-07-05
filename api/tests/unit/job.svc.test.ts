import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/job.sql', () => ({
    queryJobs: vi.fn(),
    queryJobStats: vi.fn(),
}));

import { JobService } from '../../src/services/job.svc';
import { queryJobs, queryJobStats } from '../../src/lib/job.sql';
import type { Prisma } from '@prisma/client';

const validDescription = `
About the role

We are looking for a backend engineer to join our remote engineering team.
You will build APIs, improve database performance, write tests, and work with product managers.
Requirements include TypeScript, Node.js, PostgreSQL, REST APIs, Docker, and production experience.
This role is remote within the United States and includes strong benefits and compensation.
`;

function createContainer() {
    return {
        pool: {
            query: vi.fn(),
        },
        db: {
            $connect: vi.fn(),
            job: {
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                findUnique: vi.fn(),
            },
        },
    };
}

function createCache() {
    return {
        generateKey: vi.fn((prefix: string, payload: unknown) => `${prefix}:${JSON.stringify(payload)}`),
        get: vi.fn(),
        set: vi.fn(),
        deletePattern: vi.fn(),
    };
}

function createJob(overrides: Partial<Prisma.JobCreateInput> = {}): Prisma.JobCreateInput {
    return {
        position: 'Backend Engineer',
        company: 'Acme Inc',
        location: 'Remote - United States',
        salary: '$100k - $130k',
        type: 'FULL_TIME',
        url: 'https://example.com/jobs/backend-engineer',
        source: 'RemoteOK',
        description: validDescription,
        companyKey: 'acme inc',
        positionKey: 'backend engineer',
        locationKey: 'remote',
        postedAt: new Date('2026-06-20T00:00:00.000Z'),
        ...overrides,
    };
}

describe('JobService business logic', () => {
    let container: ReturnType<typeof createContainer>;
    let cache: ReturnType<typeof createCache>;
    let service: JobService;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        container = createContainer();
        cache = createCache();
        service = new JobService(container as any, cache as any);
    });

    it('getJobs returns cached result if available', async () => {
        const cached = {
            data: [{ id: 'job_1', position: 'Backend Engineer' }],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        };

        cache.get.mockResolvedValue(cached);

        const result = await service.getJobs(1, 20, { sortBy: 'recent' });

        expect(result).toBe(cached);
        expect(queryJobs).not.toHaveBeenCalled();
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('getJobs queries DB when cache misses and stores result', async () => {
        const fresh = {
            data: [{ id: 'job_1', position: 'Backend Engineer' }],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        };

        cache.get.mockResolvedValue(null);
        vi.mocked(queryJobs).mockResolvedValue(fresh as any);

        const result = await service.getJobs(1, 20, { search: 'react', sortBy: 'recent' });

        expect(result).toBe(fresh);
        expect(queryJobs).toHaveBeenCalledWith(container.pool, 1, 20, {
            search: 'react',
            sortBy: 'recent',
        });
        expect(cache.set).toHaveBeenCalledWith(
            'jobs:{"page":1,"limit":20,"search":"react","sortBy":"recent"}',
            fresh,
            300
        );
    });

    it('saveJobs rejects bad descriptions', async () => {
        const result = await service.saveJobs([
            createJob({
                description: 'too short',
            }),
        ]);

        expect(result).toEqual({
            added: 0,
            duplicates: 0,
            skipped: 1,
            descriptionUpdated: 0,
        });

        expect(container.db.job.findFirst).not.toHaveBeenCalled();
        expect(container.db.job.create).not.toHaveBeenCalled();
    });

    it('saveJobs normalizes HTML descriptions before storing', async () => {
        container.db.job.findFirst.mockResolvedValue(null);
        container.db.job.create.mockResolvedValue({ id: 'job_1' });

        const htmlDescription = `
      <h2>About the role</h2>
      <p>We are looking for a backend engineer to join our remote engineering team.</p>
      <p>You will build APIs, improve database performance, write tests, and work with product managers.</p>
      <p>Requirements include TypeScript, Node.js, PostgreSQL, REST APIs, Docker, and production experience.</p>
      <p>This remote role includes strong salary, compensation, benefits, and team collaboration.</p>
    `;

        const result = await service.saveJobs([
            createJob({
                description: htmlDescription,
            }),
        ]);

        expect(result.added).toBe(1);

        const createArg = container.db.job.create.mock.calls[0][0];

        expect(createArg.data.description).toContain('## About the role');
        expect(createArg.data.description).not.toContain('<h2>');
        expect(createArg.data.description).not.toContain('<p>');
    });

    it('saveJobs detects duplicates by companyKey + positionKey + locationKey', async () => {
        container.db.job.findFirst.mockResolvedValue({
            id: 'existing_1',
            description: validDescription,
            postedAt: new Date('2026-06-21T00:00:00.000Z'),
            url: 'https://old.example.com/job',
        });

        container.db.job.update.mockResolvedValue({ id: 'existing_1' });

        const result = await service.saveJobs([createJob()]);

        expect(result.added).toBe(0);
        expect(result.duplicates).toBe(1);

        expect(container.db.job.findFirst).toHaveBeenCalledWith({
            where: {
                companyKey: 'acme inc',
                positionKey: 'backend engineer',
                locationKey: 'remote',
            },
            select: {
                id: true,
                description: true,
                postedAt: true,
                url: true,
            },
        });

        expect(container.db.job.create).not.toHaveBeenCalled();
        expect(container.db.job.update).toHaveBeenCalled();
    });

    it('saveJobs updates existing job with better description', async () => {
        const shorterExistingDescription = `
      About the role

      We are looking for an engineer to work with our team.
      You will build APIs and support backend systems for remote customers.
      Requirements include experience with software engineering and production systems.
    `;

        const betterIncomingDescription = validDescription.repeat(2);

        container.db.job.findFirst.mockResolvedValue({
            id: 'existing_1',
            description: shorterExistingDescription,
            postedAt: new Date('2026-06-21T00:00:00.000Z'),
            url: 'https://old.example.com/job',
        });

        container.db.job.update.mockResolvedValue({ id: 'existing_1' });

        const result = await service.saveJobs([
            createJob({
                description: betterIncomingDescription,
            }),
        ]);

        expect(result.duplicates).toBe(1);
        expect(result.descriptionUpdated).toBe(1);

        const updateArg = container.db.job.update.mock.calls[0][0];

        expect(updateArg.where).toEqual({ id: 'existing_1' });
        expect(updateArg.data.description.length).toBeGreaterThan(shorterExistingDescription.length);
        expect(updateArg.data.description).toContain('PostgreSQL');
    });

    it('saveJobs does not store LinkedIn authwall text', async () => {
        const result = await service.saveJobs([
            createJob({
                source: 'LinkedIn',
                description: `
          Join or sign in to find your next job.
          Email or phone.
          Forgot password?
          New to LinkedIn? Join now.
          By clicking continue to join or sign in, you agree to the LinkedIn User Agreement.
          LinkedIn Privacy Policy LinkedIn Cookie Policy.
        `,
            }),
        ]);

        expect(result.skipped).toBe(1);
        expect(container.db.job.create).not.toHaveBeenCalled();
        expect(container.db.job.update).not.toHaveBeenCalled();
    });

    it('saveJobs does not store RemoteHub page-wrapper text', async () => {
        const result = await service.saveJobs([
            createJob({
                source: 'RemoteHub',
                description: `
          Close Home Home General Jobs Companies Post a job Sign in Log in Menu.
          Similar jobs Related jobs Recommended jobs.
          This page wrapper contains navigation and not a real job description.
          Home General Jobs Companies Post a job Sign in Log in Menu Similar jobs.
        `,
            }),
        ]);

        expect(result.skipped).toBe(1);
        expect(container.db.job.create).not.toHaveBeenCalled();
        expect(container.db.job.update).not.toHaveBeenCalled();
    });

    it('saveJobs invalidates caches when a new job is added', async () => {
        container.db.job.findFirst.mockResolvedValue(null);
        container.db.job.create.mockResolvedValue({ id: 'job_1' });

        const result = await service.saveJobs([createJob()]);

        expect(result.added).toBe(1);
        expect(cache.deletePattern).toHaveBeenCalledWith('jobs:*');
        expect(cache.deletePattern).toHaveBeenCalledWith('job:*');
        expect(cache.deletePattern).toHaveBeenCalledWith('stats:*');
    });

    it('getStats returns cached stats if available', async () => {
        const cachedStats = {
            total: 10,
            addedToday: 2,
            bySource: [{ source: 'RemoteOK', count: 5 }],
            byType: [{ type: 'FULL_TIME', count: 10 }],
        };

        cache.get.mockResolvedValue(cachedStats);

        const result = await service.getStats();

        expect(result).toBe(cachedStats);
        expect(queryJobStats).not.toHaveBeenCalled();
    });

    it('getStats queries DB when cache misses and stores result', async () => {
        const freshStats = {
            total: 10,
            addedToday: 2,
            bySource: [{ source: 'RemoteOK', count: 5 }],
            byType: [{ type: 'FULL_TIME', count: 10 }],
        };

        cache.get.mockResolvedValue(null);
        vi.mocked(queryJobStats).mockResolvedValue(freshStats as any);

        const result = await service.getStats();

        expect(result).toBe(freshStats);
        expect(queryJobStats).toHaveBeenCalledWith(container.pool);
        expect(cache.set).toHaveBeenCalledWith('stats:{}', freshStats, 1800);
    });
});