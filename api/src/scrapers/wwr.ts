import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { Job, JobType } from '../types';
import * as cheerio from 'cheerio';
import chalk from 'chalk';
import type { Element } from 'domhandler'


export class WWRScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'WeWorkRemotely',
      url: 'https://weworkremotely.com/categories/remote-programming-jobs',
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
      console.log(chalk.cyan('🔍 Navigating to WeWorkRemotely...'));
      await this.navigateTo(this.config.url);
      await this.randomDelay(2000, 3000);

      const jobsExist = await this.waitForSelector('li.feature, section.jobs', 10000);

      if (!jobsExist) {
        console.log(chalk.yellow('⚠️  No jobs found'));
        await this.screenshot('wwr-debug.png');
        return [];
      }

      console.log(chalk.green('✓ Found job listings'));

      const html = await this.page.content();
      const $ = cheerio.load(html);

      console.log(chalk.gray('\n🔍 Debug Info:'));
      console.log(chalk.gray(`  li.feature: ${$('li.feature').length}`));
      console.log(chalk.gray(`  section.jobs li: ${$('section.jobs li').length}`));
      console.log(chalk.gray(`  Elements with .title: ${$('.title').length}`));
      console.log(chalk.gray(`  Elements with .company: ${$('.company').length}`));

      $('li.feature').each((index, element) => {
        const job = this.parseJobElement($, element, 'featured');
        if (job) {
          jobs.push(job);
          this.displayJob(job, jobs.length);
        }
      });

      $('section.jobs li').each((index, element) => {
        const $el = $(element);

        if ($el.hasClass('feature') || $el.hasClass('ad')) return;

        const job = this.parseJobElement($, element, 'regular');
        if (job) {
          jobs.push(job);
          this.displayJob(job, jobs.length);
        }
      });

      if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs from li elements, trying article elements...'));

        $('article').each((index, element) => {
          const job = this.parseJobElement($, element, 'article');
          if (job) {
            jobs.push(job);
            this.displayJob(job, jobs.length);
          }
        });
      }

      if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  Trying generic parsing...'));

        $('.title').each((index, element) => {
          const $parent = $(element).closest('li, article, div');
          const parentNode = $parent.get(0);
          if (!parentNode || (parentNode as any).type !== 'tag') return;
          const job = this.parseJobElement($, parentNode as Element, 'generic');
          if (job) {
            jobs.push(job);
            this.displayJob(job, jobs.length);
          }
        });
      }

      if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs extracted. Taking screenshot...'));
        await this.screenshot('wwr-debug.png');
      }

      console.log(chalk.green(`\n✨ WeWorkRemotely scraping complete: ${jobs.length} jobs extracted`));
      return jobs;

    } catch (error) {
      console.error(chalk.red(`❌ WeWorkRemotely scrape failed: ${error}`));
      throw error;
    }
  }

  private parseJobElement($: cheerio.CheerioAPI, element: Element, source: string): Job | null {
    try {
      const $el = $(element);

      const position = $el.find('.title').first().text().trim() ||
        $el.find('h2').first().text().trim() ||
        $el.find('h3').first().text().trim() ||
        $el.find('.job-title').first().text().trim() ||
        $el.find('span.title').first().text().trim() ||
        '';

      const company = $el.find('.company').first().text().trim() ||
        $el.find('span.company').first().text().trim() ||
        $el.find('.company-name').first().text().trim() ||
        $el.find('h4').first().text().trim() ||
        '';

      const region = $el.find('.region').first().text().trim() ||
        $el.find('.location').first().text().trim() ||
        'Anywhere';

      const href = $el.find('a').first().attr('href') || '';
      const url = href ? (href.startsWith('http') ? href : `https://weworkremotely.com${href}`) : '';

      if (!position || position.length < 3) {
        return null;
      }

      const finalCompany = company || 'Unknown Company';

      if (!url || url === 'https://weworkremotely.com') {
        return null;
      }

      return {
        company: this.cleanText(finalCompany),
        position: this.cleanText(position),
        location: this.cleanText(region),
        salary: null,
        type: JobType.FULL_TIME,
        url,
        source: 'WeWorkRemotely',
      };

    } catch (error) {
      return null;
    }
  }

  private displayJob(job: Job, index: number): void {
    console.log(chalk.cyan(`\n  ${index}. ${chalk.bold(job.position)}`));
    console.log(chalk.white(`     Company: ${job.company}`));
    console.log(chalk.gray(`     Location: ${job.location}`));
    console.log(chalk.blue(`     URL: ${job.url.substring(0, 60)}...`));
  }

  isRemoteUS(job: Job): boolean {
    const location = job.location?.toLowerCase() || '';

    const excluded = [
      'europe only',
      'eu only',
      'asia only',
      'uk only',
      'latin america only'
    ];

    const isExcluded = excluded.some(region => location.includes(region));

    return !isExcluded;
  }
}