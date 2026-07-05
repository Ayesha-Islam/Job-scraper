import { describe, it, expect, vi } from 'vitest';

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

import {
  cleanHtml,
  cleanDescription,
  standardizePostedDate,
  isUSOrRemoteJob,
  extractTechStack,
  extractBulletSection,
  toDbJob,
  type Job,
} from '../../src/scrape';

describe('scrape pure helpers', () => {
  it('removes raw HTML safely', () => {
    const result = cleanHtml('<h2>Role</h2><p>Hello <strong>React</strong></p><script>x</script>');

    expect(result).toContain('## Role');
    expect(result).toContain('Hello React');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<script>');
  });

  it('cleans RemoteHub navigation noise', () => {
    const result = cleanDescription([
      'Home',
      'General',
      'Jobs',
      'About the role',
      'You will build backend services for a remote engineering team.',
      'Similar jobs',
      'Post a job',
    ].join('\n'));

    expect(result).toContain('About the role');
    expect(result).not.toContain('Similar jobs');
  });

  it('converts "2 weeks ago" into valid ISO date', () => {
    const fallback = new Date('2026-06-22T00:00:00.000Z');

    const result = standardizePostedDate('2 weeks ago', fallback);

    expect(result).toBe('2026-06-08T00:00:00.000Z');
  });

  it('filters non-US locations', () => {
    expect(isUSOrRemoteJob('Remote - United States')).toBe(true);
    expect(isUSOrRemoteJob('New York, NY')).toBe(true);
    expect(isUSOrRemoteJob('Remote - Europe')).toBe(false);
    expect(isUSOrRemoteJob('Pakistan')).toBe(false);
  });

  it('extracts tech stack keywords', () => {
    const result = extractTechStack('We use React, TypeScript, Node.js, PostgreSQL, Redis, Docker and AWS.');

    expect(result).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'AWS'])
    );
  });

  it('extracts bullet sections', () => {
    const result = extractBulletSection(
      [
        'Requirements:',
        '- 3+ years building production backend services',
        '- Strong TypeScript and PostgreSQL experience',
        '',
        'Benefits:',
        '- Remote work',
      ].join('\n'),
      ['Requirements']
    );

    expect(result).toEqual([
      '3+ years building production backend services',
      'Strong TypeScript and PostgreSQL experience',
    ]);
  });

  it('converts scraper job into Prisma JobCreateInput', () => {
    const job: Job = {
      id: '1',
      title: 'Senior Backend Engineer',
      company: 'Acme Inc',
      location: 'Remote - United States',
      isRemote: true,
      salary: '$120k - $150k',
      jobType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      categories: [],
      description: 'You will build APIs and backend services for our engineering team.',
      requirements: [],
      responsibilities: [],
      techStack: ['TypeScript'],
      benefits: [],
      url: 'https://example.com/jobs/1',
      source: 'RemoteOK',
      postedAt: '2026-06-20T00:00:00.000Z',
      scrapedAt: '2026-06-22T00:00:00.000Z',
      isActive: true,
    };

    const result = toDbJob(job);

    expect(result).toMatchObject({
      position: 'Senior Backend Engineer',
      company: 'Acme Inc',
      location: 'Remote - United States',
      salary: '$120k - $150k',
      type: 'FULL_TIME',
      url: 'https://example.com/jobs/1',
      source: 'RemoteOK',
      companyKey: 'acme inc',
      positionKey: 'senior backend engineer',
      locationKey: 'remote',
    });

    expect(result.postedAt).toBeInstanceOf(Date);
  });
});