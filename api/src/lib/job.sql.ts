import { Pool } from 'pg';
import { JobFilters, PaginatedResponse, JobStats } from '../types';
import type { Job } from '@prisma/client';

export async function queryJobs(
  pool: Pool,
  page: number,
  limit: number,
  filters: JobFilters
): Promise<PaginatedResponse<Job>> {
  const offset = (page - 1) * limit;

  const conditions: string[] = ['"isActive" = true'];
  const params: any[] = [];

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    params.push(term);
    const n = params.length;
    conditions.push(
      `(position ILIKE $${n} OR company ILIKE $${n} OR location ILIKE $${n} OR description ILIKE $${n})`
    );
  }

  if (filters.company?.trim()) {
    params.push(`%${filters.company.trim()}%`);
    conditions.push(`company ILIKE $${params.length}`);
  }

  if (filters.location?.trim()) {
    params.push(`%${filters.location.trim()}%`);
    conditions.push(`location ILIKE $${params.length}`);
  }

  if (filters.type) {
    params.push(filters.type);
    conditions.push(`type = $${params.length}::"JobType"`);
  }

  if (filters.source) {
    params.push(filters.source);
    conditions.push(`source = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const orderByMap: Record<string, string> = {
    recent: '"postedAt" DESC NULLS LAST, "createdAt" DESC',
    oldest: '"postedAt" ASC NULLS LAST, "createdAt" ASC',
    salary: 'salary DESC NULLS LAST',
  };
  const orderBy = orderByMap[filters.sortBy ?? 'recent'] ?? orderByMap.recent;

  const countSql = `SELECT COUNT(*)::int AS total FROM "Job" WHERE ${whereClause}`;

  params.push(limit, offset);
  const dataSql = `
    SELECT *
    FROM   "Job"
    WHERE  ${whereClause}
    ORDER  BY ${orderBy}
    LIMIT  $${params.length - 1}
    OFFSET $${params.length}
  `;

  const countParams = params.slice(0, params.length - 2);
  const [dataResult, countResult] = await Promise.all([
    pool.query(dataSql, params),
    pool.query(countSql, countParams),
  ]);

  const total: number = countResult.rows[0]?.total ?? 0;

  return {
    data: dataResult.rows as Job[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function queryJobStats(pool: Pool): Promise<JobStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalResult, todayResult, bySourceResult, byTypeResult] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Job" WHERE "isActive" = true`
    ),
    pool.query<{ added_today: number }>(
      `SELECT COUNT(*)::int AS added_today FROM "Job" WHERE "isActive" = true AND "createdAt" >= $1`,
      [today]
    ),
    pool.query<{ source: string; count: number }>(
      `SELECT source, COUNT(*)::int AS count
       FROM   "Job"
       WHERE  "isActive" = true
       GROUP  BY source
       ORDER  BY count DESC`
    ),
    pool.query<{ type: string; count: number }>(
      `SELECT type::text, COUNT(*)::int AS count
       FROM   "Job"
       WHERE  "isActive" = true
       GROUP  BY type
       ORDER  BY count DESC`
    ),
  ]);

  return {
    total: totalResult.rows[0]?.total ?? 0,
    addedToday: todayResult.rows[0]?.added_today ?? 0,
    bySource: bySourceResult.rows,
    byType: byTypeResult.rows,
  };
}