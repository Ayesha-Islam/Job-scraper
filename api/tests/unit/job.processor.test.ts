import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const puppeteerState = vi.hoisted(() => ({
  html: '',
  gotoReject: true,
}));

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setViewport: vi.fn().mockResolvedValue(undefined),
        evaluateOnNewDocument: vi.fn().mockResolvedValue(undefined),
        setRequestInterception: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        setUserAgent: vi.fn().mockResolvedValue(undefined),
        goto: vi.fn().mockImplementation(async () => {
          if (puppeteerState.gotoReject) {
            throw new Error('Navigation failed');
          }
        }),
        content: vi.fn().mockImplementation(async () => puppeteerState.html),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { JobProcessor } from '../../src/services/job.processor';
import type { Job } from '../../src/scrape';

function validDescription() {
  return `
    About the role

    We are looking for a backend engineer to join our remote engineering team.
    You will build APIs, improve database performance, write tests, and work with product managers.
    Requirements include TypeScript, Node.js, PostgreSQL, REST APIs, Docker, and production experience.
    This role is remote within the United States.
  `;
}

function validLongDescription() {
  return `
    About the role

    We are looking for a senior backend engineer to join our remote engineering team in the United States.
    You will design APIs, improve database performance, write automated tests, review pull requests, and collaborate with product managers.
    Requirements include TypeScript, Node.js, PostgreSQL, REST APIs, Docker, distributed systems experience, observability, and production ownership.
    You will work with a strong engineering team, improve reliability, support customers, and help us build scalable backend services.
    This role is remote within the United States and includes salary, compensation, benefits, and growth opportunities.
  `;
}

function validNoUsSignalDescription() {
  return `
    About the role

    We are looking for a backend engineer to join our remote engineering team.
    You will build APIs, improve database performance, write tests, and work with product managers.
    Requirements include TypeScript, Node.js, PostgreSQL, REST APIs, Docker, and production experience.
    This role is fully remote and includes strong compensation and benefits.
  `;
}

function linkedInAuthwallDescription() {
  return `
    Join or sign in to find your next job.
    Email or phone.
    Forgot password?
    New to LinkedIn? Join now.
    By clicking continue to join or sign in, you agree to the LinkedIn User Agreement.
    LinkedIn Privacy Policy LinkedIn Cookie Policy.
  `;
}

function remoteHubWrapperDescription() {
  return `
    Close Home Home General Jobs Companies Post a job Sign in Log in Menu.
    Similar jobs Related jobs Recommended jobs.
    This page wrapper contains navigation and not a real job description.
    Home General Jobs Companies Post a job Sign in Log in Menu Similar jobs.
  `;
}

function createJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job_1',
    title: 'Backend Engineer',
    company: 'Acme Inc',
    location: 'Remote - United States',
    isRemote: true,
    salary: '$100k',
    jobType: 'FULL_TIME',
    experienceLevel: 'MID',
    categories: [],
    description: validDescription(),
    requirements: [],
    responsibilities: [],
    techStack: [],
    benefits: [],
    url: 'https://example.com/jobs/1',
    source: 'We Work Remotely',
    postedAt: new Date('2026-06-22T00:00:00.000Z').toISOString(),
    scrapedAt: new Date('2026-06-22T00:00:00.000Z').toISOString(),
    isActive: true,
    ...overrides,
  };
}

function createJobService(result = {
  added: 1,
  duplicates: 0,
  skipped: 0,
  descriptionUpdated: 0,
}) {
  return {
    saveJobs: vi.fn().mockResolvedValue(result),
  };
}

describe('JobProcessor.process', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    puppeteerState.html = '';
    puppeteerState.gotoReject = true;

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('accepts valid We Work Remotely jobs and saves converted DB payload', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService);

    const result = await processor.process([createJob()], 'We Work Remotely');

    expect(jobService.saveJobs).toHaveBeenCalledTimes(1);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.extractionMethods['enrichment:disabled']).toBe(1);

    const savedJobs = jobService.saveJobs.mock.calls[0][0];

    expect(savedJobs).toHaveLength(1);
    expect(savedJobs[0]).toMatchObject({
      position: 'Backend Engineer',
      company: 'Acme Inc',
      location: 'Remote - United States',
      salary: '$100k',
      source: 'We Work Remotely',
      type: 'FULL_TIME',
      companyKey: 'acme inc',
      positionKey: 'backend engineer',
      locationKey: 'remote',
    });
  });

  it('preserves usable LinkedIn descriptions instead of risking worse enrichment', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService, { timeout: 1 });

    const result = await processor.process([
      createJob({
        source: 'LinkedIn',
        url: 'https://www.linkedin.com/jobs/view/123',
        description: validLongDescription(),
      }),
    ], 'LinkedIn');

    expect(jobService.saveJobs).toHaveBeenCalledTimes(1);
    expect(result.enriched).toBe(0);
    expect(result.enrichmentFailed).toBe(0);
    expect(result.extractionMethods['linkedin:preserved']).toBe(1);

    const savedJobs = jobService.saveJobs.mock.calls[0][0];

    expect(savedJobs[0].description).toContain('senior backend engineer');
    expect(savedJobs[0].source).toBe('LinkedIn');
  });

  it('rejects real LinkedIn authwall descriptions when enrichment fails', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService, { timeout: 1 });

    const result = await processor.process([
      createJob({
        source: 'LinkedIn',
        url: 'https://www.linkedin.com/jobs/view/123',
        description: linkedInAuthwallDescription(),
      }),
    ], 'LinkedIn');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.enrichmentFailed).toBe(1);
    expect(result.skipReasons.description_bad_scrape).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.startsWith('linkedin_enrichment_unstable'))).toBe(true);
  });

  it('rejects real RemoteHub page-wrapper descriptions when enrichment fails', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService, { timeout: 1 });

    const result = await processor.process([
      createJob({
        source: 'RemoteHub',
        url: 'https://www.remotehub.com/jobs/details/123',
        description: remoteHubWrapperDescription(),
      }),
    ], 'RemoteHub');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.enrichmentFailed).toBe(1);
    expect(result.skipReasons.description_bad_scrape).toBeGreaterThan(0);
  });

  it('filters explicit non-US restricted jobs', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService);

    const result = await processor.process([
      createJob({
        location: 'Europe only',
        description: `
          Applicants must be from Europe only.
          This role requires engineering experience with backend services, production systems,
          TypeScript, PostgreSQL, API design, testing, and remote collaboration.
        `,
      }),
    ], 'We Work Remotely');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.filtered).toBe(1);
    expect(result.skipReasons.non_us_restricted).toBe(1);
  });

  it('rejects remote jobs with no US signal', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService);

    const result = await processor.process([
      createJob({
        location: 'Remote',
        description: validNoUsSignalDescription(),
      }),
    ], 'We Work Remotely');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.filtered).toBe(1);
    expect(result.skipReasons.missing_us_signal).toBe(1);
  });

  it('accepts jobs when US signal exists in description even if location is generic remote', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService);

    const result = await processor.process([
      createJob({
        location: 'Remote',
        description: validDescription(),
      }),
    ], 'We Work Remotely');

    expect(jobService.saveJobs).toHaveBeenCalledTimes(1);
    expect(result.filtered).toBe(0);
    expect(result.skipReasons.missing_us_signal).toBe(0);
  });

  it('tracks base validation skip reasons correctly', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService);

    const result = await processor.process([
      createJob({ title: '' }),
      createJob({ url: 'not-a-url' }),
      createJob({ description: 'too short' }),
    ], 'We Work Remotely');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.skipReasons.missing_required_field).toBe(1);
    expect(result.skipReasons.invalid_url).toBe(1);
    expect(result.skipReasons.description_too_short).toBe(1);
  });

  it('returns enrichment failures without crashing', async () => {
    const jobService = createJobService();
    const processor = new JobProcessor(jobService, { timeout: 1 });

    const result = await processor.process([
      createJob({
        source: 'LinkedIn',
        url: 'https://www.linkedin.com/jobs/view/123',
        description: 'short',
      }),
    ], 'LinkedIn');

    expect(jobService.saveJobs).not.toHaveBeenCalled();
    expect(result.enrichmentFailed).toBe(1);
    expect(result.dbErrors).toBe(0);
  });

  it('records DB save failures without crashing the processor', async () => {
    const jobService = {
      saveJobs: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };

    const processor = new JobProcessor(jobService);
    const result = await processor.process([createJob()], 'We Work Remotely');

    expect(jobService.saveJobs).toHaveBeenCalledTimes(1);
    expect(result.dbErrors).toBe(1);
    expect(result.warnings).toContain('db_save_failed:database unavailable');
    expect(result.added).toBe(0);
  });
});