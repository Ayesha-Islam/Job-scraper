import { vi } from 'vitest';

export function createTestContainer() {
    return {
        jobController: {
            getJobs: vi.fn(),
            searchJobs: vi.fn(),
            getJobById: vi.fn(),
        },
        statsController: {
            getStats: vi.fn(),
        },
        healthController: {
            check: vi.fn(),
            checkDatabase: vi.fn(),
            checkRedis: vi.fn(),
        },
        authController: {
            register: vi.fn(),
            login: vi.fn(),
            me: vi.fn(),
        },
        adminController: {
            triggerScrape: vi.fn(),
            getScrapeLogs: vi.fn(),
            getScrapeStats: vi.fn(),
            clearCache: vi.fn(),
            getCacheStats: vi.fn(),
        },
    };
}