import Redis from 'ioredis';
import chalk from 'chalk';
import { env } from './config';

export class CacheService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {

    try {
      if (env.REDIS_URL) {
        this.client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
        });
      } else {
        this.client = new Redis({
          host: env.REDIS_HOST,
          port: parseInt(env.REDIS_PORT, 10),
          ...(env.REDIS_PASSWORD
            ? { password: env.REDIS_PASSWORD }
            : {}),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
        });
      }
      
      this.client.on('error', (err) => {
        console.error(chalk.red('❌ Redis error:'), err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log(chalk.green('✓ Redis connected'));
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('close', () => {
        console.log(chalk.yellow('⚠️  Redis connection closed'));
        this.isConnected = false;
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });
    } catch (error) {
      console.error(chalk.red('❌ Redis initialization failed:'), error);
      this.client = null;
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    if (this.isConnected || this.client.status === 'ready') {
      this.isConnected = true;
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect to Redis:'), error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.status !== 'end') {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async ping(): Promise<string> {
    const client = this.getClient();
    return await client.ping();
  }

  async info(section?: string): Promise<string> {
    const client = this.getClient();
    return section ? await client.info(section) : await client.info();
  }

  async keys(pattern = '*'): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');

    return `${prefix}:${sortedParams}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      console.error(chalk.red(`❌ Cache get error for key ${key}:`), error);
      return null;
    }
  }

  async set(key: string, value: any, ttl = 300): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
    } catch (error) {
      console.error(chalk.red(`❌ Cache set error for key ${key}:`), error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(chalk.red(`❌ Cache delete error for key ${key}:`), error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(chalk.green(`✓ Deleted ${keys.length} keys matching ${pattern}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Cache deletePattern error for pattern ${pattern}:`), error);
    }
  }

  async clear(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.flushdb();
      console.log(chalk.green('✓ Cache cleared'));
    } catch (error) {
      console.error(chalk.red('❌ Cache clear error:'), error);
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  private getClient(): Redis {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    return this.client;
  }
}

export default CacheService;