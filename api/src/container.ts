import { env, type Env } from './config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import IORedis from 'ioredis';

export class Container {
  private static instance: Container;

  public readonly env: Env;
  public readonly db: PrismaClient;
  public readonly redis: IORedis;
  public readonly pool: Pool;

  private constructor() {
    this.env = env;

    console.log('🔄 Initializing Prisma...');
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    const adapter = new PrismaPg(this.pool);

    this.db = new PrismaClient({
      adapter,
      log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Initialize Redis
    console.log('🔄 Connecting to Redis...');
    this.redis = new IORedis({
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT, 10),
      ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (err: any) => {
      console.error('❌ Redis error:', err);
    });

    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.db.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  async close(): Promise<void> {
    console.log('👋 Shutting down gracefully...');
    await this.db.$disconnect();
    await this.redis.quit();
    console.log('✅ All connections closed');
  }
}