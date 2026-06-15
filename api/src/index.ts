import app from './app';
import container from './container';
import chalk from 'chalk';
import { setupScheduler } from './scheduler';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log(chalk.cyan('🚀 Starting Job Scraper API...'));
    console.log(chalk.gray(`   Environment: ${process.env.NODE_ENV || 'development'}`));

    await container.connect();

    setupScheduler();
    console.log(chalk.green('✓ Scheduler initialized'));

    const server = app.listen(PORT, () => {
      console.log(chalk.green(`✓ Server running on port ${PORT}`));
      console.log(chalk.cyan(`   http://localhost:${PORT}`));
      console.log(chalk.cyan(`   Health: http://localhost:${PORT}/api/v1/health`));
      console.log(chalk.cyan(`   Jobs: http://localhost:${PORT}/api/v1/jobs`));
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(chalk.red(`❌ Port ${PORT} is already in use`));
      } else {
        console.error(chalk.red('❌ Server error:'), error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error(chalk.red('❌ Failed to start server:'), error);
    process.exit(1);
  }
}

startServer();