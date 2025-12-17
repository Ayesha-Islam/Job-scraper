import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { Job, JobType } from '../types';
import * as cheerio from 'cheerio';
import chalk from 'chalk';

export class RemotiveScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'Remotive',
      url: 'https://remotive.com/remote-jobs/software-dev',
      maxRetries: 3,
      timeout: 30000,
      useClaudeAPI: false,
    };
    super(container, config);
  }

  async scrapeJobs(): Promise<Job[]> {
    if (!this.page) throw new Error('Page not initialized');

    const jobs: Job[] = [];

    try {
      console.log(chalk.cyan('🔍 Navigating to Remotive...'));
      await this.navigateTo(this.config.url);
      await this.randomDelay(2000, 3000);

      const selectors = [
        '.job-tile',
        'article',
        '[class*="job"]',
        '.job-list-item'
      ];

      let jobsExist = false;
      for (const selector of selectors) {
        jobsExist = await this.waitForSelector(selector, 10000);
        if (jobsExist) {
          console.log(chalk.green(`✓ Found jobs using selector: ${selector}`));
          break;
        }
      }

      if (!jobsExist) {
        console.log(chalk.yellow('⚠️  No jobs found. Taking screenshot...'));
        await this.screenshot('remotive-debug.png');
        
        console.log(chalk.cyan('🔄 Trying API approach...'));
        return await this.scrapeViaAPI();
      }

      await this.autoScroll(2, 1000);

      const html = await this.page.content();
      const $ = cheerio.load(html);

      let jobElements = $('.job-tile');
      if (jobElements.length === 0) jobElements = $('article');
      if (jobElements.length === 0) jobElements = $('[class*="job-"]');

      console.log(chalk.green(`📋 Found ${jobElements.length} job elements`));

      jobElements.each((index, element) => {
        try {
          const $el = $(element);
          
          const position = $el.find('h2, h3, .job-title, [class*="title"]').first().text().trim();
          const company = $el.find('.company, [class*="company"]').first().text().trim();
          const location = $el.find('.location, [class*="location"]').first().text().trim() || 'Remote';
          const url = $el.find('a').first().attr('href') || '';
          
          if (!position || !company) return;

          const job: Job = {
            company: this.cleanText(company),
            position: this.cleanText(position),
            location: this.cleanText(location),
            salary: null,
            type: JobType.FULL_TIME,
            url: url.startsWith('http') ? url : `https://remotive.com${url}`,
            source: 'Remotive',
          };

          jobs.push(job);
          
          console.log(chalk.cyan(`\n  ${jobs.length}. ${chalk.bold(job.position)}`));
          console.log(chalk.white(`     Company: ${job.company}`));
          console.log(chalk.gray(`     Location: ${job.location}`));

        } catch (error) {
          console.log(chalk.yellow(`  ↳ Failed to parse job: ${error}`));
        }
      });

      console.log(chalk.green(`\n✨ Remotive scraping complete: ${jobs.length} jobs extracted`));
      return jobs;

    } catch (error) {
      console.error(chalk.red(`❌ Remotive scrape failed: ${error}`));
      throw error;
    }
  }

  private async scrapeViaAPI(): Promise<Job[]> {
    try {
      if (!this.page) throw new Error('Page not initialized');

      const apiUrl = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=50';
      
      await this.navigateTo(apiUrl);
      await this.sleep(2000);

      const jsonText = await this.page.evaluate(() => document.body.textContent || '');
      const data = JSON.parse(jsonText);

      const jobs: Job[] = [];

      if (data.jobs && Array.isArray(data.jobs)) {
        data.jobs.slice(0, 30).forEach((jobData: any, index: number) => {
          const job: Job = {
            company: jobData.company_name || 'Unknown',
            position: jobData.title || 'Unknown Position',
            location: jobData.candidate_required_location || 'Remote',
            salary: jobData.salary || null,
            type: JobType.FULL_TIME,
            url: jobData.url || `https://remotive.com/remote-jobs/${jobData.id}`,
            source: 'Remotive',
            description: jobData.description?.substring(0, 500),
          };

          jobs.push(job);

          console.log(chalk.cyan(`\n  ${index + 1}. ${chalk.bold(job.position)}`));
          console.log(chalk.white(`     Company: ${job.company}`));
          console.log(chalk.gray(`     Location: ${job.location}`));
        });
      }

      console.log(chalk.green(`\n✨ Remotive API scraping complete: ${jobs.length} jobs extracted`));
      return jobs;
    } catch (error) {
      console.error(chalk.red(`API scraping also failed: ${error}`));
      return [];
    }
  }

  isRemoteUS(job: Job): boolean {
    const location = job.location?.toLowerCase() || '';
    
    return (
      location.includes('united states') ||
      location.includes('usa') ||
      location.includes('us only') ||
      location.includes('worldwide') ||
      location.includes('anywhere') ||
      location.includes('north america') ||
      location === 'remote'
    ) && !(
      location.includes('europe only') ||
      location.includes('asia only')
    );
  }
}