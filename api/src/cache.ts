import Redis from 'ioredis';
import chalk from 'chalk';

export class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true, 
      });

      this.client.on('error', (err) => {
        console.error(chalk.red('❌ Redis error:'), err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log(chalk.green('✓ Redis connected'));
        this.isConnected = true;
      });

      this.client.on('close', () => {
        console.log(chalk.yellow('⚠️  Redis connection closed'));
        this.isConnected = false;
      });

    } catch (error) {
      console.error(chalk.red('❌ Redis initialization failed:'), error);
      this.client = null;
    }
  }

  async connect(): Promise<void> {
    if (this.client && !this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error(chalk.red('❌ Failed to connect to Redis:'), error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  async ping(): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.ping();
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
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

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
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
    return this.isConnected && this.client !== null;
  }
}

export default CacheService;