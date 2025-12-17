import { Container } from '../container';
import { CacheService } from '../cache';
import { JobFilters, PaginatedResponse } from '../types';
import { createHash } from 'crypto';
import type { Prisma, Job as PrismaJob, JobType as PrismaJobType } from '@prisma/client'

export type JobType = PrismaJobType
export type Job = PrismaJob

export class JobService {
    constructor(
        private container: Container,
        private cache: CacheService
    ) { }

    async getJobs(
        page: number = 1,
        limit: number = 20,
        filters: JobFilters = {}
    ): Promise<PaginatedResponse<Job>> {
        const cacheKey = this.cache.generateKey('jobs', { page, limit, ...filters });

        const cached = await this.cache.get<PaginatedResponse<Job>>(cacheKey);
        if (cached) return cached;

        const where: any = { isActive: true };
        if (filters.company) where.company = { contains: filters.company, mode: 'insensitive' };
        if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
        if (filters.type) where.type = filters.type;
        if (filters.source) where.source = filters.source;

        const [jobs, total] = await Promise.all([
            this.container.db.job.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.container.db.job.count({ where }),
        ]);

        const result: PaginatedResponse<Job> = {
            data: jobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        await this.cache.set(cacheKey, result, 300);

        return result;
    }

    async getJobById(id: string): Promise<Job | null> {
        const cacheKey = this.cache.generateKey('job', { id });

        const cached = await this.cache.get<Job>(cacheKey);
        if (cached) return cached;

        const job = await this.container.db.job.findUnique({
            where: { id },
        });

        if (job) {
            await this.cache.set(cacheKey, job, 600);
        }

        return job;
    }

    async getStats(): Promise<{
        total: number;
        bySource: { source: string; count: number; }[];
        byType: { type: string; count: number; }[];
    }> {
        const cacheKey = this.cache.generateKey('stats', {});

        const cached = await this.cache.get<{ total: number; bySource: { source: string; count: number; }[]; byType: { type: string; count: number; }[]; }>(cacheKey);
        if (cached) return cached;

        const [total, bySource, byType] = await Promise.all([
            this.container.db.job.count({ where: { isActive: true } }),
            this.container.db.job.groupBy({
                by: ['source'],
                where: { isActive: true },
                _count: { source: true },
            }),
            this.container.db.job.groupBy({
                by: ['type'],
                where: { isActive: true },
                _count: { type: true },
            }),
        ]);

        const stats = {
            total,
            bySource: bySource.map((s: { source: any; _count: { source: any; }; }) => ({ source: s.source, count: s._count.source })),
            byType: byType.map((t: { type: any; _count: { type: any; }; }) => ({ type: t.type, count: t._count.type })),
        };

        await this.cache.set(cacheKey, stats, 1800);

        return stats;
    }

    async saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{ added: number; duplicates: number; }> {
        let added = 0;
        let duplicates = 0;

        for (const job of jobs) {
            try {
                const hash = createHash('md5')
                    .update(`${job.url.toLowerCase()}:${job.position.toLowerCase()}`)
                    .digest('hex');

                const existing = await this.container.db.job.findUnique({
                    where: { hash },
                });

                if (existing) {
                    await this.container.db.job.update({
                        where: { hash },
                        data: {
                            isActive: true,
                            scrapedAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                    duplicates++;
                } else {
                    await this.container.db.job.create({
                        data: {
                            ...job,
                            hash,
                            isActive: true,
                            scrapedAt: new Date(),
                        },
                    });
                    added++;
                }
            } catch (error) {
                console.error('Failed to save job:', error);
            }
        }

        return { added, duplicates };
    }

    async invalidateCaches(): Promise<void> {
        await Promise.all([
            this.cache.deletePattern('jobs:*'),
            this.cache.deletePattern('job:*'),
            this.cache.deletePattern('stats:*'),
        ]);
    }
}