import { Job, ScrapeResult } from './types';
import { Request, Response, NextFunction } from 'express';

export interface IDatabase {
    job: any;
    scrapeLog: any;
    jobAlert: any;
    $disconnect(): Promise<void>;
}

export interface ICache {
    key(prefix: string, params: Record<string, any>): string;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
}

export interface ILogger {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

export interface IEmailService {
    sendErrorAlert(result: ScrapeResult): Promise<void>;
    sendSummaryEmail(results: ScrapeResult[]): Promise<void>;
}

export interface IScraper {
    name: string;
    scrape(): Promise<ScrapeResult>;
}

export interface IScraperManager {
    runAll(): Promise<ScrapeResult[]>;
    runOne(name: string): Promise<ScrapeResult>;
}

export interface IController {
    getJobs(req: Request, res: Response): Promise<void>;
    getJob(req: Request, res: Response): Promise<void>;
    getStats(req: Request, res: Response): Promise<void>;
    createAlert(req: Request, res: Response): Promise<void>;
    health(req: Request, res: Response): void;
    triggerScrape(req: Request, res: Response): Promise<void>;
}
