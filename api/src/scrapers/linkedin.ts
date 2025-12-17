import { BaseScraper, ScraperConfig } from './base';
import { Container } from '../container';
import { Job, JobType } from '../types';
import * as cheerio from 'cheerio';
import chalk from 'chalk';

export class LinkedInScraper extends BaseScraper {
  constructor(container: Container) {
    const config: ScraperConfig = {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States&f_WT=2&position=1&pageNum=0',
      maxRetries: 3,
      timeout: 60000,
      useClaudeAPI: false,
    };
    super(container, config);
  }

  async scrapeJobs(): Promise<Job[]> {
    if (!this.page) throw new Error('Page not initialized');

    const jobs: Job[] = [];

    try {
      console.log(chalk.cyan('🔍 Navigating to LinkedIn...'));
      await this.navigateTo(this.config.url);
      await this.randomDelay(3000, 5000);

      const jobsExist = await this.waitForSelector('ul.jobs-search__results-list', 10000);
      
      if (!jobsExist) {
        console.log(chalk.yellow('⚠️  No job listings found'));
        await this.screenshot('linkedin-debug.png');
        return [];
      }

      console.log(chalk.green('✓ Found jobs container: ul.jobs-search__results-list'));
      console.log(chalk.cyan('📜 Scrolling to load more jobs...'));
      await this.autoScroll(3, 2000);

      // ✅ FIX: Use Cheerio instead of page.evaluate
      const html = await this.page.content();
      const $ = cheerio.load(html);

      // Count job cards
      const jobCards = $('.job-search-card, .jobs-search-results__list-item, .base-card, [data-job-id]');
      console.log(chalk.green(`📋 Found ${jobCards.length} job cards`));

      if (jobCards.length === 0) {
        console.log(chalk.yellow('⚠️  No job cards found in HTML'));
        await this.screenshot('linkedin-no-cards.png');
        
        // Debug: show what we found
        console.log(chalk.gray('\n🔍 Debug Info:'));
        console.log(chalk.gray(`  .job-search-card: ${$('.job-search-card').length}`));
        console.log(chalk.gray(`  .base-card: ${$('.base-card').length}`));
        console.log(chalk.gray(`  [data-job-id]: ${$('[data-job-id]').length}`));
        
        return [];
      }

      const limit = Math.min(jobCards.length, 20);
      
      jobCards.slice(0, limit).each((index, element) => {
        try {
          const $card = $(element);
          
          let position = $card.find('.base-search-card__title').text().trim() ||
                        $card.find('.job-card-list__title').text().trim() ||
                        $card.find('h3').first().text().trim() ||
                        $card.find('[class*="title"]').first().text().trim();

          let company = $card.find('.base-search-card__subtitle').text().trim() ||
                       $card.find('.job-card-container__company-name').text().trim() ||
                       $card.find('h4').first().text().trim() ||
                       $card.find('[class*="company"]').first().text().trim();

          let location = $card.find('.job-search-card__location').text().trim() ||
                        $card.find('.job-card-container__metadata-item').text().trim() ||
                        $card.find('[class*="location"]').first().text().trim() ||
                        'Remote - USA';

          let url = $card.find('a').first().attr('href') || '';
          
          if (url.includes('?')) {
            url = url.split('?')[0];
          }

          if (!position || position.length < 3) {
            console.log(chalk.gray(`  ↳ Skipping job ${index + 1}: No position title`));
            return;
          }

          if (!company || company.length < 2) {
            console.log(chalk.gray(`  ↳ Skipping job ${index + 1}: No company name`));
            return;
          }

          const job: Job = {
            company: this.cleanText(company),
            position: this.cleanText(position),
            location: this.cleanText(location),
            salary: null,
            type: JobType.FULL_TIME,
            url: url || `https://linkedin.com/jobs/view/${Date.now()}-${index}`,
            source: 'LinkedIn',
            description: undefined,
          };

          jobs.push(job);

          console.log(chalk.cyan(`\n  ${jobs.length}. ${chalk.bold(job.position)}`));
          console.log(chalk.white(`     Company: ${job.company}`));
          console.log(chalk.gray(`     Location: ${job.location}`));
          console.log(chalk.blue(`     URL: ${job.url.substring(0, 60)}...`));

          if (jobs.length % 5 === 0) {
            console.log(chalk.gray(`\n  ✓ Processed ${jobs.length} jobs`));
          }

        } catch (error) {
          console.log(chalk.yellow(`  ↳ Failed to parse job ${index + 1}: ${error}`));
        }
      });

      console.log(chalk.green(`\n✨ LinkedIn scraping complete: ${jobs.length} jobs extracted`));
      
      if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs extracted. Saving HTML for debugging...'));
        await this.screenshot('linkedin-final.png');
      }

      return jobs;

    } catch (error) {
      console.error(chalk.red(`❌ LinkedIn scrape failed: ${error}`));
      await this.screenshot('linkedin-error.png');
      throw error;
    }
  }

  isRemoteUS(job: Job): boolean {
    const location = job.location?.toLowerCase() || '';
    const position = job.position.toLowerCase();
    
    const isRemote = 
      location.includes('remote') ||
      position.includes('remote') ||
      location.includes('anywhere') ||
      location.includes('work from home');

    const isUS = 
      location.includes('united states') ||
      location.includes('usa') ||
      location.includes('u.s.') ||
      /\b(california|new york|texas|florida|washington|illinois|massachusetts|virginia|colorado|oregon|pennsylvania)\b/i.test(location);

    const excluded = 
      location.includes('europe only') ||
      location.includes('asia only');

    return (isRemote || isUS) && !excluded;
  }
}