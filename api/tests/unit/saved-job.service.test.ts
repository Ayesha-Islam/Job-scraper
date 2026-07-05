import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { SavedJobService } from '../../src/services/saved-job.service';

function createDbMock() {
  return {
    job: {
      findUnique: vi.fn(),
    },
    savedJob: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

describe('SavedJobService', () => {
  let db: ReturnType<typeof createDbMock>;
  let service: SavedJobService;

  beforeEach(() => {
    db = createDbMock();
    service = new SavedJobService(db as any);
  });

  it('saves a job for a user', async () => {
    const savedJob = {
      id: 1,
      userId: 7,
      jobId: 'job-1',
      savedAt: new Date('2026-01-01T00:00:00.000Z'),
      job: { id: 'job-1', position: 'Backend Engineer' },
    };

    db.job.findUnique.mockResolvedValue({ id: 'job-1' });
    db.savedJob.create.mockResolvedValue(savedJob);

    await expect(service.saveJob(7, 'job-1')).resolves.toEqual(savedJob);

    expect(db.job.findUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      select: { id: true },
    });
    expect(db.savedJob.create).toHaveBeenCalledWith({
      data: { userId: 7, jobId: 'job-1' },
      include: { job: true },
    });
  });

  it('throws NotFoundError when the job does not exist', async () => {
    db.job.findUnique.mockResolvedValue(null);

    await expect(service.saveJob(7, 'missing-job')).rejects.toMatchObject({
      name: 'NotFoundError',
      message: 'Job not found',
    });

    expect(db.savedJob.create).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the job is already saved', async () => {
    db.job.findUnique.mockResolvedValue({ id: 'job-1' });

    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`userId`,`jobId`)',
      {
        code: 'P2002',
        clientVersion: 'test',
      }
    );

    db.savedJob.create.mockRejectedValue(duplicateError);

    await expect(service.saveJob(7, 'job-1')).rejects.toMatchObject({
      name: 'ConflictError',
      message: 'Job already saved',
    });
  });

  it('lists saved jobs newest first', async () => {
    const savedJobs = [
      { id: 2, userId: 7, jobId: 'job-2', job: { id: 'job-2' } },
      { id: 1, userId: 7, jobId: 'job-1', job: { id: 'job-1' } },
    ];

    db.savedJob.findMany.mockResolvedValue(savedJobs);

    await expect(service.getSavedJobs(7)).resolves.toEqual(savedJobs);

    expect(db.savedJob.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { job: true },
      orderBy: { savedAt: 'desc' },
    });
  });

  it('removes a saved job idempotently', async () => {
    db.savedJob.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.removeSavedJob(7, 'job-1')).resolves.toEqual({
      removed: true,
    });

    expect(db.savedJob.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, jobId: 'job-1' },
    });
  });

  it('checks whether a job is saved', async () => {
    db.savedJob.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);

    await expect(service.isJobSaved(7, 'job-1')).resolves.toBe(true);
    await expect(service.isJobSaved(7, 'job-2')).resolves.toBe(false);

    expect(db.savedJob.findUnique).toHaveBeenCalledWith({
      where: {
        userId_jobId: {
          userId: 7,
          jobId: 'job-1',
        },
      },
      select: { id: true },
    });
  });
});
