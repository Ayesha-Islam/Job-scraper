import { Job, ScrapeResult } from './types';
import { Request, Response, NextFunction } from 'express';

// Database Interface
export interface IDatabase {
    job: any;
    scrapeLog: any;
    jobAlert: any;
    $disconnect(): Promise<void>;
}

// Cache Interface
export interface ICache {
    key(prefix: string, params: Record<string, any>): string;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
}

// Logger Interface
export interface ILogger {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

// Email Interface
export interface IEmailService {
    sendErrorAlert(result: ScrapeResult): Promise<void>;
    sendSummaryEmail(results: ScrapeResult[]): Promise<void>;
}

// Scraper Interface
export interface IScraper {
    name: string;
    scrape(): Promise<ScrapeResult>;
}

// Scraper Manager Interface
export interface IScraperManager {
    runAll(): Promise<ScrapeResult[]>;
    runOne(name: string): Promise<ScrapeResult>;
}

// Controller Interface
export interface IController {
    getJobs(req: Request, res: Response): Promise<void>;
    getJob(req: Request, res: Response): Promise<void>;
    getStats(req: Request, res: Response): Promise<void>;
    createAlert(req: Request, res: Response): Promise<void>;
    health(req: Request, res: Response): void;
    triggerScrape(req: Request, res: Response): Promise<void>;
}
