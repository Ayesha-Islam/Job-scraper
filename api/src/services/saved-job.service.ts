import { Prisma, PrismaClient } from '@prisma/client';

export class SavedJobService {
    constructor(private db: PrismaClient) { }
    private isUniqueConstraintError(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) || (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002'
            );
    }

    async saveJob(userId: number, jobId: string) {
        const job = await this.db.job.findUnique({
            where: { id: jobId },
            select: { id: true },
        });

        if (!job) {
            const error = new Error('Job not found');
            error.name = 'NotFoundError';
            throw error;
        }

        try {
            return await this.db.savedJob.create({
                data: {
                    userId,
                    jobId,
                },
                include: {
                    job: true,
                },
            });
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                const conflict = new Error('Job already saved');
                conflict.name = 'ConflictError';
                throw conflict;
            }

            throw error;
        }
    }

    async getSavedJobs(userId: number) {
        return this.db.savedJob.findMany({
            where: { userId },
            include: {
                job: true,
            },
            orderBy: {
                savedAt: 'desc',
            },
        });
    }

    async removeSavedJob(userId: number, jobId: string) {
        await this.db.savedJob.deleteMany({
            where: {
                userId,
                jobId,
            },
        });

        return { removed: true };
    }

    async isJobSaved(userId: number, jobId: string) {
        const savedJob = await this.db.savedJob.findUnique({
            where: {
                userId_jobId: {
                    userId,
                    jobId,
                },
            },
            select: {
                id: true,
            },
        });

        return Boolean(savedJob);
    }
}