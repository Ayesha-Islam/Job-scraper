import { Container } from '../container';
import { Job, JobType, JobFilters, PaginatedResponse, JobStats } from '../types';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import chalk from 'chalk';
import { CacheService } from '../cache/store';

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
        if (cached) {
            console.log(chalk.gray('   📦 Cache hit'));
            return cached;
        }

        const where: Prisma.JobWhereInput = { isActive: true };

        if (filters.search?.trim()) {
            const searchTerm = filters.search.trim();
            where.OR = [
                { position: { contains: searchTerm, mode: 'insensitive' } },
                { company: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { location: { contains: searchTerm, mode: 'insensitive' } }
            ];
        }

        if (filters.company?.trim()) {
            where.company = { contains: filters.company.trim(), mode: 'insensitive' };
        }

        if (filters.location?.trim()) {
            where.location = { contains: filters.location.trim(), mode: 'insensitive' };
        }

        if (filters.type) {
            where.type = filters.type;
        }

        if (filters.source) {
            where.source = filters.source;
        }

        const sortOptions: Record<string, Prisma.JobOrderByWithRelationInput> = {
            recent: { createdAt: 'desc' },
            oldest: { createdAt: 'asc' },
            salary: { salary: 'desc' }
        };
        const orderBy = sortOptions[filters.sortBy || 'recent'] || sortOptions.recent;

        const [jobs, total] = await Promise.all([
            this.container.db.job.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy,
            }),
            this.container.db.job.count({ where }),
        ]);

        const result: PaginatedResponse<Job> = {
            data: jobs as Job[],
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
            await this.cache.set(cacheKey, job as Job, 600);
        }

        return job as Job | null;
    }

    async getStats(): Promise<JobStats> {
        const cacheKey = this.cache.generateKey('stats', {});

        const cached = await this.cache.get<JobStats>(cacheKey);
        if (cached) {
            console.log(chalk.gray('   📦 Stats cache hit'));
            return cached;
        }

        console.log(chalk.cyan('   🔄 Calculating fresh stats...'));
        const today = new Date();
        today.setHours(0, 0, 0, 0);



        const [total, addedToday, bySource, byType] = await Promise.all([
            this.container.db.job.count({ where: { isActive: true } }),
            this.container.db.job.count({
                where: {
                    isActive: true,
                    createdAt: {
                        gte: today,
                    },
                },
            }),

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

        const stats: JobStats = {
            total,
            addedToday,
            bySource: bySource.map(s => ({ source: s.source, count: s._count.source })),
            byType: byType.map(t => ({ type: t.type, count: t._count.type })),
        };

        console.log(chalk.green(`   ✅ Stats calculated: ${total} total, ${addedToday} added today`));

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

                const result = await this.container.db.job.upsert({
                    where: { url: job.url },
                    update: {
                        position: job.position,
                        company: job.company,
                        location: job.location,
                        salary: job.salary,
                        type: job.type,
                        description: job.description,
                        hash: hash,
                        isActive: true,
                        scrapedAt: new Date(),
                        updatedAt: new Date(),
                    },
                    create: {
                        ...job,
                        hash: hash,
                        isActive: true,
                        scrapedAt: new Date(),
                    }
                });

                const isNew = Math.abs(result.updatedAt.getTime() - result.createdAt.getTime()) < 1000;
                if (isNew) {
                    added++;
                } else {
                    duplicates++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to save job: ${job.position}`, error);
                duplicates++;
            }
        }

        if (added > 0) {
            await this.cache.deletePattern('stats:*');
            console.log(chalk.gray('   🔄 Stats cache invalidated'));
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