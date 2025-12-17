export enum JobType {
    FULL_TIME = 'FULL_TIME',
    PART_TIME = 'PART_TIME',
    CONTRACT = 'CONTRACT',
    INTERNSHIP = 'INTERNSHIP',
}

export interface Job {
    id?: string | undefined;
    company: string;
    position: string;
    location: string | null;
    salary: string | null;
    type: JobType;
    url: string;
    source: string;
    description?: string | undefined;
    hash?: string | undefined;
    isActive?: boolean | undefined;
    scrapedAt?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}

export interface ScrapeResult {
    source: string;
    jobsFound: number;
    jobsAdded: number;
    jobsDuplicate: number;
    duration: number;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
}

export interface JobFilters {
    company?: string;
    location?: string;
    type?: JobType;
    source?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: {
        cached?: boolean;
        timestamp?: string;
    };
}