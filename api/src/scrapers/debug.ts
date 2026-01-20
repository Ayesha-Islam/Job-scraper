import { Container } from '../container';
import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { WWRScraper } from './wwr';
import chalk from 'chalk';

async function debugScraper(name: string) {
  const container = Container.getInstance();
  
  console.log(chalk.bold.cyan(`\n🔍 DEBUGGING ${name.toUpperCase()} SCRAPER\n`));
  
  let scraper: LinkedInScraper | RemotiveScraper | WWRScraper;
  if (name === 'linkedin') scraper = new LinkedInScraper(container);
  else if (name === 'remotive') scraper = new RemotiveScraper(container);
  else scraper = new WWRScraper(container);

  try {
    await (scraper as any).initBrowser();
    console.log(chalk.green('✓ Browser initialized\n'));

    const jobs = await scraper.scrapeJobs();
    console.log(chalk.green(`\n✅ Total jobs scraped: ${jobs.length}\n`));
    
    if (jobs.length === 0) {
      console.log(chalk.red('❌ No jobs found. Check network connection or site structure.'));
      await (scraper as any).cleanup();
      await container.close();
      return;
    }

    console.log(chalk.cyan('📋 Sample Jobs (first 3):'));
    jobs.slice(0, 3).forEach((job, i) => {
      console.log(chalk.white(`\n${i + 1}. ${job.position}`));
      console.log(chalk.gray(`   Company: ${job.company}`));
      console.log(chalk.gray(`   Location: "${job.location}"`));
      console.log(chalk.gray(`   URL: ${job.url.substring(0, 70)}...`));
      console.log(chalk.gray(`   Type: ${job.type}`));
    });

    console.log(chalk.cyan('\n🔍 Testing US Remote Filter:\n'));
    
    const passed: typeof jobs = [];
    const failed: typeof jobs = [];

    jobs.forEach(job => {
      if (scraper.isRemoteUS(job)) {
        passed.push(job);
      } else {
        failed.push(job);
      }
    });

    console.log(chalk.green(`✅ PASSED: ${passed.length} jobs`));
    console.log(chalk.red(`❌ FAILED: ${failed.length} jobs\n`));

    if (failed.length > 0) {
      console.log(chalk.yellow('🔍 Sample Failed Jobs (why they were filtered):'));
      failed.slice(0, 5).forEach((job, i) => {
        console.log(chalk.gray(`\n${i + 1}. ${job.position}`));
        console.log(chalk.gray(`   Location: "${job.location}"`));
        
        const loc = (job.location || '').toLowerCase();
        const reasons: string[] = [];
        
        if (loc.includes('europe only')) reasons.push('Europe only');
        if (loc.includes('eu only')) reasons.push('EU only');
        if (loc.includes('asia only')) reasons.push('Asia only');
        if (loc.includes('uk only')) reasons.push('UK only');
        if (loc.includes('canada only')) reasons.push('Canada only');
        if (loc.includes('latin america only')) reasons.push('LATAM only');
        
        if (reasons.length === 0) {
          reasons.push('Does not match US/Worldwide criteria');
        }
        
        console.log(chalk.red(`   Reason: ${reasons.join(', ')}`));
      });
    }

    if (passed.length > 0) {
      console.log(chalk.cyan('\n🔍 Checking for duplicates in database...\n'));
      
      const urls = passed.map(j => j.url);
      const existing = await container.db.job.findMany({
        where: { url: { in: urls } },
        select: { url: true, position: true, company: true, createdAt: true }
      });

      console.log(chalk.yellow(`⚠️  ${existing.length}/${passed.length} jobs already exist in database`));
      
      if (existing.length > 0) {
        console.log(chalk.gray('\nSample Duplicates (when they were added):'));
        existing.slice(0, 3).forEach((job, i) => {
          const daysAgo = Math.floor((Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          console.log(chalk.gray(`${i + 1}. ${job.position} at ${job.company}`));
          console.log(chalk.gray(`   Added: ${daysAgo} days ago`));
        });
      }

      const newJobs = passed.length - existing.length;
      if (newJobs > 0) {
        console.log(chalk.green(`\n✨ ${newJobs} jobs would be added as NEW`));
      } else {
        console.log(chalk.yellow('\n⚠️  All jobs are duplicates - scraping is working, but no new jobs available'));
        console.log(chalk.gray('💡 Tip: Clear old jobs or wait for new postings'));
      }
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
  } finally {
    await (scraper as any).cleanup();
    await container.close();
  }
}

const scraperName = process.argv[2] || 'wwr';
debugScraper(scraperName).catch(console.error);