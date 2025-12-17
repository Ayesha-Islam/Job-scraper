import { Container } from '../container';

async function monitorScrapers() {
  const container = Container.getInstance();

  const logs = await container.db.scrapeLog.findMany({
    take: 10,
    orderBy: { completedAt: 'desc' },
  });

  console.log('\n📊 RECENT SCRAPER ACTIVITY\n');
  console.log('─'.repeat(80));

  logs.forEach((log: { status: string; durationMs: number; source: string; completedAt: { toISOString: () => any; }; jobsFound: any; jobsAdded: any; errorMessage: any; }) => {
    const status = log.status === 'SUCCESS' ? '✅' : '❌';
    const duration = (log.durationMs / 1000).toFixed(2);
    
    console.log(`${status} ${log.source.padEnd(20)} | ${log.completedAt.toISOString()}`);
    console.log(`   Found: ${log.jobsFound} | Added: ${log.jobsAdded} | Duration: ${duration}s`);
    
    if (log.errorMessage) {
      console.log(`   Error: ${log.errorMessage}`);
    }
    console.log('─'.repeat(80));
  });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = await container.db.scrapeLog.findMany({
    where: { completedAt: { gte: last24h } },
  });

  const successCount = recentLogs.filter((l: { status: string; }) => l.status === 'SUCCESS').length;
  const totalCount = recentLogs.length;
  const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(2) : 'N/A';

  console.log('\n📈 LAST 24 HOURS');
  console.log(`Total Runs: ${totalCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  console.log(`Success Rate: ${successRate}%`);

  await container.close();
}

monitorScrapers();
