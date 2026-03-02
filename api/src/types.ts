import type { Job as PrismaJob, JobType as PrismaJobType } from '@prisma/client';

export { JobType } from '@prisma/client';
export type Job = PrismaJob;

export interface JobFilters {
  search?: string;
  company?: string;
  location?: string;
  type?: PrismaJobType;
  source?: string;
  sortBy?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    query?: string | null;
    [key: string]: any;
  };
}

export interface JobStats {
  total: number;
  addedToday: number;
  bySource: SourceStats[];
  byType: TypeStats[];
}

export interface SourceStats {
  source: string;
  count: number;
}

export interface TypeStats {
  type: string;
  count: number;
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

export interface ScrapedJob {
  position: string;
  company: string;
  location: string;
  salary: string | null;
  type: PrismaJobType;
  url: string;
  source: string;
  description: string;
  postedAt: Date | string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  id: number | string;
  email: string;
  name: string;
  token?: string;
  created_at?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database?: {
    status: 'connected' | 'disconnected';
  };
  cache?: {
    status: 'connected' | 'disconnected';
  };
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export interface JobQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  company?: string;
  location?: string;
  type?: string;
  source?: string;
  sortBy?: string;
}

export interface CacheConfig {
  ttl: number;
  prefix: string;
}

export interface ScraperConfig {
  name: string;
  url: string;
  maxRetries: number;
  timeout: number;
  useClaudeAPI: boolean;
  useBrowser?: boolean;
}