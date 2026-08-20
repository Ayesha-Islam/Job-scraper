import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContainer } from '../helpers/create-test-container';
import { createTestApp } from '../helpers/create-test-app';
import { env } from '../../src/config';

vi.mock('../../src/lib/prisma', () => {
  const db = {
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

  return { db };
});

import { db } from '../../src/lib/prisma';

const mockedDb = db as any;

function createToken(userId = 7) {
  return jwt.sign(
    { id: userId, email: 'saved@example.com' },
    env.JWT_SECRET
  );
}

describe('Saved Jobs API', () => {
  const container = createTestContainer();
  const app = createTestApp(container);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/saved-jobs saves a job', async () => {
    const token = createToken(7);
    const savedJob = {
      id: 1,
      userId: 7,
      jobId: 'job-1',
      savedAt: '2026-01-01T00:00:00.000Z',
      job: { id: 'job-1', position: 'Backend Engineer' },
    };

    mockedDb.job.findUnique.mockResolvedValue({ id: 'job-1' });
    mockedDb.savedJob.create.mockResolvedValue(savedJob);

    const res = await request(app)
      .post('/api/v1/saved-jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ jobId: 'job-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: savedJob });
    expect(mockedDb.savedJob.create).toHaveBeenCalledWith({
      data: { userId: 7, jobId: 'job-1' },
      include: { job: true },
    });
  });

  it('POST /api/v1/saved-jobs returns 409 for duplicate save', async () => {
    const token = createToken(7);

    mockedDb.job.findUnique.mockResolvedValue({ id: 'job-1' });
    mockedDb.savedJob.create.mockRejectedValue({ code: 'P2002' });

    const res = await request(app)
      .post('/api/v1/saved-jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ jobId: 'job-1' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, error: 'Job already saved' });
  });

  it('POST /api/v1/saved-jobs returns 404 for a non-existent job', async () => {
    const token = createToken(7);

    mockedDb.job.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/saved-jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ jobId: 'missing-job' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Job not found' });
    expect(mockedDb.savedJob.create).not.toHaveBeenCalled();
  });

  it('GET /api/v1/saved-jobs lists saved jobs newest first', async () => {
    const token = createToken(7);
    const savedJobs = [
      { id: 2, userId: 7, jobId: 'job-2', job: { id: 'job-2' } },
      { id: 1, userId: 7, jobId: 'job-1', job: { id: 'job-1' } },
    ];

    mockedDb.savedJob.findMany.mockResolvedValue(savedJobs);

    const res = await request(app)
      .get('/api/v1/saved-jobs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: savedJobs });
    expect(mockedDb.savedJob.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { job: true },
      orderBy: { savedAt: 'desc' },
    });
  });

  it('DELETE /api/v1/saved-jobs/:jobId deletes a saved job', async () => {
    const token = createToken(7);

    mockedDb.savedJob.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .delete('/api/v1/saved-jobs/job-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { removed: true } });
    expect(mockedDb.savedJob.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, jobId: 'job-1' },
    });
  });

  it('GET /api/v1/saved-jobs/check/:jobId returns saved state', async () => {
    const token = createToken(7);

    mockedDb.savedJob.findUnique.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .get('/api/v1/saved-jobs/check/job-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { saved: true } });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const postRes = await request(app)
      .post('/api/v1/saved-jobs')
      .send({ jobId: 'job-1' });

    const getRes = await request(app).get('/api/v1/saved-jobs');
    const deleteRes = await request(app).delete('/api/v1/saved-jobs/job-1');

    expect(postRes.status).toBe(401);
    expect(getRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);

    expect(postRes.body).toEqual({ success: false, error: 'Unauthorized' });
    expect(getRes.body).toEqual({ success: false, error: 'Unauthorized' });
    expect(deleteRes.body).toEqual({ success: false, error: 'Unauthorized' });
  });
});
