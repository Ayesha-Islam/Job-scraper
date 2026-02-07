export interface Job {
  id: string;
  company: string;
  title: string;
  location: string | null;
  salary: string | null;
  type: JobType;
  url: string;
  source: string;
  description: string | null;
  hash: string;
  isActive: boolean;
  scrapedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
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

export interface Stats {
  total: number;
  addedToday: number;
  bySource: { source: string; count: number }[];
  byType: { type: string; count: number }[];
}

export interface JobFilters {
  search?: string;
  type?: JobType | 'ALL';
  location?: string;
  sortBy?: 'recent' | 'oldest';
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date | string;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  job: Job;
  savedAt: Date | string;
}
