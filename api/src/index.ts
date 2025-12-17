import { createApp } from './app';
import { setupScheduler } from './scheduler';

async function bootstrap() {
    const { app, container, cache, jobService } = createApp();

    setupScheduler(container, cache, jobService);

    const PORT = container.env.PORT;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📝 Environment: ${container.env.NODE_ENV}`);
    });

    process.on('SIGTERM', async () => {
        console.log('SIGTERM received');
        cache.destroy();
        await container.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('SIGINT received');
        cache.destroy();
        await container.close();
        process.exit(0);
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});