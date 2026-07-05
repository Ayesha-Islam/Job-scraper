import { describe, it, expect, vi } from 'vitest';
import { queryJobs } from '../../src/lib/job.sql';

function createPoolMock(rows: any[] = [], total = 0) {
  return {
    query: vi.fn()
      .mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [{ total }] }),
  };
}

describe('queryJobs', () => {
  it('uses postedAt DESC NULLS LAST for recent jobs', async () => {
    const pool = createPoolMock([], 0);

    await queryJobs(pool as any, 1, 20, { sortBy: 'recent' });

    const dataSql = pool.query.mock.calls[0][0];

    expect(dataSql).toContain('"postedAt" DESC NULLS LAST');
    expect(dataSql).toContain('"createdAt" DESC');
  });

  it('uses postedAt ASC NULLS LAST for oldest jobs', async () => {
    const pool = createPoolMock([], 0);

    await queryJobs(pool as any, 1, 20, { sortBy: 'oldest' });

    const dataSql = pool.query.mock.calls[0][0];

    expect(dataSql).toContain('"postedAt" ASC NULLS LAST');
    expect(dataSql).toContain('"createdAt" ASC');
  });

  it('falls back to recent sort for invalid sortBy', async () => {
    const pool = createPoolMock([], 0);

    await queryJobs(pool as any, 1, 20, { sortBy: 'invalid' as any });

    const dataSql = pool.query.mock.calls[0][0];

    expect(dataSql).toContain('"postedAt" DESC NULLS LAST');
  });

  it('applies search, company, location, type, and source filters', async () => {
    const pool = createPoolMock([], 0);

    await queryJobs(pool as any, 2, 10, {
      search: 'react',
      company: 'acme',
      location: 'remote',
      type: 'FULL_TIME' as any,
      source: 'LinkedIn',
      sortBy: 'recent',
    });

    const dataSql = pool.query.mock.calls[0][0];
    const dataParams = pool.query.mock.calls[0][1];

    expect(dataSql).toContain('position ILIKE $1');
    expect(dataSql).toContain('company ILIKE $2');
    expect(dataSql).toContain('location ILIKE $3');
    expect(dataSql).toContain('type = $4::"JobType"');
    expect(dataSql).toContain('source = $5');
    expect(dataParams).toEqual([
      '%react%',
      '%acme%',
      '%remote%',
      'FULL_TIME',
      'LinkedIn',
      10,
      10,
    ]);
  });

  it('passes correct LIMIT and OFFSET params', async () => {
    const pool = createPoolMock([], 0);

    await queryJobs(pool as any, 3, 25, {});

    const dataParams = pool.query.mock.calls[0][1];

    expect(dataParams).toEqual([25, 50]);
  });

  it('returns pagination metadata correctly', async () => {
    const rows = [{ id: 'job_1', position: 'Engineer' }];
    const pool = createPoolMock(rows, 51);

    const result = await queryJobs(pool as any, 2, 20, {});

    expect(result.data).toEqual(rows);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 51,
      totalPages: 3,
    });
  });
});