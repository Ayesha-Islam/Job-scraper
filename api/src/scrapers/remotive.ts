import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { ScrapedJob } from '../types';
import chalk from 'chalk';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary?: string;
  description?: string;
}

interface RemotiveAPIResponse {
  jobs: RemotiveJob[];
}

export class RemotiveScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'Remotive',
      url: 'https://remotive.com/api/remote-jobs?category=software-dev&limit=50',
      maxRetries: 2,
      timeout: 15000,
      useClaudeAPI: false,
      useBrowser: false, 
    };
    super(container, config);
  }

  async scrapeJobs(): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];

    try {
      console.log(chalk.cyan('🔍 Fetching from Remotive API...'));

      const data = await this.fetchApi<RemotiveAPIResponse>(this.config.url);
      
      if (!data.jobs || data.jobs.length === 0) {
        console.log(chalk.yellow('⚠️  No jobs returned from API'));
        return jobs;
      }

      console.log(chalk.cyan(`📋 Retrieved ${data.jobs.length} jobs from API`));

      for (const apiJob of data.jobs) {
        if (!apiJob.title || !apiJob.company_name || !apiJob.url) {
          continue;
        }

        const job: ScrapedJob = {
          company: this.cleanText(apiJob.company_name),
          position: this.cleanText(apiJob.title),
          location: apiJob.candidate_required_location || 'Remote - Worldwide',
          salary: apiJob.salary || null,
          type: this.parseJobType(apiJob.job_type || apiJob.category),
          url: apiJob.url,
          source: 'Remotive',
          description: apiJob.description || null,
        };

        jobs.push(job);
      }

      console.log(chalk.green(`✨ Remotive API complete: ${jobs.length} jobs extracted`));
      return jobs;

    } catch (error) {
      console.error(chalk.red('❌ Remotive API error:'), error);
      return [];
    }
  }

  protected async initBrowser(): Promise<void> {
    console.log(chalk.gray('ℹ️  Using API mode (no browser needed)'));
  }

  protected async cleanup(): Promise<void> {
  }

  isRemoteUS(job: ScrapedJob): boolean {
    const loc = (job.location || '').toLowerCase();

    const isUS = loc.includes('us') || 
                 loc.includes('united states') ||
                 loc.includes('usa') ||
                 loc.includes('america');

    const isWorldwide = loc.includes('worldwide') ||
                        loc.includes('anywhere') ||
                        (loc.includes('remote') && !loc.includes('only'));

    const excluded = [
      'europe only',
      'eu only', 
      'asia only',
      'uk only',
      'canada only',
      'latam only',
      'africa only'
    ];
    
    const isExcluded = excluded.some(region => loc.includes(region));

    return (isUS || isWorldwide) && !isExcluded;
  }
}