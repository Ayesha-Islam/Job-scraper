import { Container } from '../container';
import { Job, JobType, JobFilters, PaginatedResponse, JobStats } from '../types';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import chalk from 'chalk';
import { CacheService } from '../cache';

const DEBUG = process.env.DEBUG === 'true';

export class JobService {
    constructor(
        private container: Container,
        private cache: CacheService
    ) { }

    private async withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err: any) {
                const isConnErr =
                    err?.message?.includes('Failed to connect') ||
                    err?.message?.includes('connection') ||
                    err?.message?.includes('ECONNRESET') ||
                    err?.message?.includes('ETIMEDOUT');

                if (isConnErr && i < retries - 1) {
                    const wait = 2000 * (i + 1);
                    console.warn(chalk.yellow(`   ⚠️  DB connection lost — reconnecting in ${wait / 1000}s (attempt ${i + 1}/${retries - 1})...`));
                    await new Promise(r => setTimeout(r, wait));
                    try { await this.container.db.$connect(); } catch { /* ignore if already connected */ }
                    continue;
                }
                throw err;
            }
        }
        throw new Error('DB retries exhausted');
    }

    private removeEmoji(text: string): string {
        if (!text) return '';
        return text
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ')
            .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
            .replace(/[\u{2300}-\u{23FF}]/gu, ' ')
            .replace(/[\u{1F004}-\u{1F0CF}]/gu, ' ')
            .replace(/  +/g, ' ')
            .trim();
    }

    private isValidJobDescription(description: string | null | undefined): boolean {
        if (!description) return false;

        const cleaned = this.removeEmoji(description).trim();

        if (cleaned.length < 80) {
            if (DEBUG) console.log(chalk.gray(`     ⚠️  Description too short (${cleaned.length} chars)`));
            return false;
        }

        const pureNavStart = /^(log in|frontpage|dark mode|general\s+frontpage|join\s+remote\s+ok|join\s+log\s+in|sign up\s+to|create account|forgot password|please\s+(enable|accept)|cookie\s+(policy|notice)|hire remote workers\s+post|learn the skills employers|enhance your skills with courses)/i;
        if (pureNavStart.test(cleaned)) {
            if (DEBUG) console.log(chalk.gray(`     ⚠️  Description looks like metadata/nav`));
            return false;
        }

        const jobKeywords = /role|responsibilit|requirement|qualif|experience|skill|candidate|position|engineer|developer|designer|manager|team|project|work|what you|what we|about the role|must have|you will|we are looking|we're looking|join our|join us|salary|compensation|benefit|remote/i;
        if (!jobKeywords.test(cleaned)) {
            if (DEBUG) console.log(chalk.gray(`     ⚠️  No job keywords found`));
            return false;
        }

        const words = cleaned.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 20) {
            if (DEBUG) console.log(chalk.gray(`     ⚠️  Not enough words (${words.length})`));
            return false;
        }

        const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
        if (avgWordLength < 3) {
            if (DEBUG) console.log(chalk.gray(`     ⚠️  Average word length too short (${avgWordLength.toFixed(1)})`));
            return false;
        }

        return true;
    }

    private cleanDescription(description: string | null | undefined): string | null {
        if (!description) return null;

        let cleaned = this.removeEmoji(description).trim();
        if (!cleaned) return null;

        cleaned = cleaned
            .replace(/[ \t]+/g, ' ')      
            .replace(/\n{3,}/g, '\n\n')    
            .trim();

        if (this.isValidJobDescription(cleaned)) {
            return cleaned;
        }

        if (DEBUG) console.log(chalk.gray(`     ⚠️  Description failed validation after cleaning`));
        return null;
    }

    private validateJobData(job: Prisma.JobCreateInput): boolean {
        if (!job.position || typeof job.position !== 'string' || job.position.trim() === '') {
            if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping job: Missing or invalid position`));
            return false;
        }

        if (!job.company || typeof job.company !== 'string' || job.company.trim() === '') {
            if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping job: Missing or invalid company for position "${job.position}"`));
            return false;
        }

        if (!job.url || typeof job.url !== 'string' || job.url.trim() === '') {
            if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping job: Missing or invalid URL for position "${job.position}"`));
            return false;
        }

        if (!job.source || typeof job.source !== 'string' || job.source.trim() === '') {
            if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping job: Missing or invalid source for position "${job.position}"`));
            return false;
        }

        if (!job.type || typeof job.type !== 'string') {
            if (DEBUG) console.log(chalk.yellow(`   ⚠️  Skipping job: Missing or invalid type for position "${job.position}"`));
            return false;
        }

        const invalidPositions = [
            'view company profile',
            'view profile',
            'apply now',
            'learn more',
            'see more',
            'view job',
            'view details',
            'company profile',
            'read more',
            'more info',
            'click here',
        ];

        const positionLower = job.position.toLowerCase().trim();
        if (invalidPositions.includes(positionLower)) {
            console.log(chalk.yellow(`   ⚠️  Skipping invalid position: "${job.position}"`));
            return false;
        }

        if (job.position.trim().length < 3) {
            console.log(chalk.yellow(`   ⚠️  Skipping suspiciously short position: "${job.position}"`));
            return false;
        }

        if (job.position.includes('<') || job.position.includes('>')) {
            console.log(chalk.yellow(`   ⚠️  Skipping position with HTML tags: "${job.position}"`));
            return false;
        }

        if (job.company.includes('<') || job.company.includes('>')) {
            console.log(chalk.yellow(`   ⚠️  Skipping company with HTML tags: "${job.company}"`));
            return false;
        }

        try {
            new URL(job.url);
        } catch {
            console.log(chalk.yellow(`   ⚠️  Skipping invalid URL format: "${job.url}"`));
            return false;
        }

        return true;
    }

    private normalizeJobData(job: Prisma.JobCreateInput): Prisma.JobCreateInput {
        return {
            position: job.position.trim(),
            company: job.company.trim(),
            location: job.location?.trim() || null,
            salary: (() => {
                const s = job.salary?.trim();
                return (s && /[\d$\u20ac\u00a3\u00a5\u20b9]/.test(s)) ? s : null;
            })(),
            type: job.type,
            url: job.url.trim(),
            source: job.source.trim(),
            description: job.description?.trim() || null,
            hash: job.hash,
            ...(job.postedAt ? { postedAt: job.postedAt } : {}),
        };
    }

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
                    createdAt: { gte: today },
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

    async cleanupBadDescriptions(): Promise<{ updated: number; cleared: number }> {
        console.log(chalk.cyan('\n   🧹 Cleaning up bad descriptions in database...\n'));

        const allJobs = await this.container.db.job.findMany({
            where: { isActive: true },
            select: { id: true, position: true, description: true },
        });

        let updated = 0;
        let cleared = 0;

        for (const job of allJobs) {
            if (!job.description) continue;

            const isBad = !this.isValidJobDescription(job.description);
            const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(job.description);
            const hasMetadata = /^(log in|frontpage|dark mode|join remote ok|learn the skills employers)/i.test(job.description.trim());

            if (isBad || hasEmoji || hasMetadata) {
                await this.withDbRetry(() =>
                    this.container.db.job.update({
                        where: { id: job.id },
                        data: { description: null },
                    })
                );
                cleared++;
                console.log(chalk.gray(`     ✗ Cleared: ${job.position} (${job.description.substring(0, 50)}...)`));
            }
        }

        console.log(chalk.green(`\n   ✅ Cleanup complete: ${cleared} bad descriptions cleared\n`));
        return { updated, cleared };
    }

  
    async saveJobs(jobs: Prisma.JobCreateInput[]): Promise<{
        added: number;
        duplicates: number;
        skipped: number;
        descriptionUpdated: number;
    }> {
        let added = 0;
        let duplicates = 0;
        let skipped = 0;
        let descriptionUpdated = 0;

        const validJobs = jobs.filter(job => {
            const isValid = this.validateJobData(job);
            if (!isValid) skipped++;
            return isValid;
        });

        if (validJobs.length === 0) {
            console.log(chalk.yellow('   ⚠️  No valid jobs to save after filtering'));
            return { added: 0, duplicates: 0, skipped, descriptionUpdated: 0 };
        }

        console.log(chalk.cyan(`   📝 Saving ${validJobs.length} validated jobs (${skipped} skipped)...`));

        for (const job of validJobs) {
            try {
                const normalizedJob = this.normalizeJobData(job);

                const cleanedDescription = this.cleanDescription(normalizedJob.description);

                if (!cleanedDescription) {
                    if (DEBUG) console.log(chalk.gray(`   ⏭  Skipping (no valid description): ${normalizedJob.position} at ${normalizedJob.company}`));
                    skipped++;
                    continue;
                }

                const hash = (normalizedJob.hash as string) || createHash('md5')
                    .update(`${normalizedJob.url.toLowerCase()}:${normalizedJob.position.toLowerCase()}`)
                    .digest('hex');

                const existingByUrl = await this.withDbRetry(() =>
                    this.container.db.job.findFirst({
                        where: { url: normalizedJob.url },
                        select: { id: true, description: true },
                    })
                );

                if (existingByUrl) {
                    const updateData: any = {
                        position: normalizedJob.position,
                        company: normalizedJob.company,
                        location: normalizedJob.location,
                        salary: normalizedJob.salary,
                        type: normalizedJob.type,
                        isActive: true,
                        scrapedAt: new Date(),
                        hash,
                        description: cleanedDescription,
                        ...(normalizedJob.postedAt ? { postedAt: normalizedJob.postedAt } : {}),
                    };

                    if (existingByUrl.description !== cleanedDescription) {
                        descriptionUpdated++;
                        if (DEBUG) console.log(chalk.blue(`     ↻ Updated description: ${normalizedJob.position}`));
                    }

                    await this.withDbRetry(() =>
                        this.container.db.job.update({
                            where: { id: existingByUrl.id },
                            data: updateData,
                        })
                    );
                    duplicates++;
                    if (DEBUG) console.log(chalk.gray(`   ↻ Updated: ${normalizedJob.position} at ${normalizedJob.company}`));

                } else {
                    await this.withDbRetry(() =>
                        this.container.db.job.create({
                            data: {
                                position: normalizedJob.position,
                                company: normalizedJob.company,
                                location: normalizedJob.location,
                                salary: normalizedJob.salary,
                                type: normalizedJob.type,
                                url: normalizedJob.url,
                                source: normalizedJob.source,
                                description: cleanedDescription,
                                hash,
                                isActive: true,
                                scrapedAt: new Date(),
                                ...(normalizedJob.postedAt ? { postedAt: normalizedJob.postedAt } : {}),
                            },
                        })
                    );
                    added++;
                    if (DEBUG) console.log(chalk.green(`   ✓ Added: ${normalizedJob.position} at ${normalizedJob.company}`));
                }

            } catch (error: any) {
                console.error(chalk.red(`   ❌ Error saving job: ${job.position}`));
                if (error?.code === 'P2002') {
                    console.warn(chalk.yellow(`   ⚠️  Unique constraint violation for: ${job.position}`));
                }
                if (DEBUG) console.error(error);
                skipped++;
            }
        }

        if (added > 0 || descriptionUpdated > 0) {
            await this.cache.deletePattern('stats:*');
            if (DEBUG) console.log(chalk.gray('   🔄 Stats cache invalidated'));
        }

        return { added, duplicates, skipped, descriptionUpdated };
    }

    async invalidateCaches(): Promise<void> {
        await Promise.all([
            this.cache.deletePattern('jobs:*'),
            this.cache.deletePattern('job:*'),
            this.cache.deletePattern('stats:*'),
        ]);
    }
}