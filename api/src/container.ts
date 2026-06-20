import { env, pool, type Env } from './config';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { HealthController } from './controllers/health.controller';
import { JobController } from './controllers/job.controller';
import { StatsController } from './controllers/stats.controller';
import { JobService } from './services/job.svc';
import chalk from 'chalk';
import { CacheService } from './cache';
import { AuthController } from './controllers/auth.controller';
import { AdminController } from './controllers/admin.controller';
import { PrismaClient } from '@prisma/client';
import { db } from './lib/prisma';

export class Container {
  private static instance: Container;
  private _db: PrismaClient;
  private _pool: Pool;
  private _cache: CacheService;
  private _jobService: JobService;
  private _jobController: JobController;
  private _statsController: StatsController;
  private _healthController: HealthController;
  private _authController: AuthController;
  private _adminController: AdminController;

  public readonly env: Env;
  // public readonly redis: IORedis;

  private constructor() {
    console.log(chalk.cyan('🔧 Initializing Container...'));
    this.env = env;

    // this.redis = new IORedis({
    //   host: env.REDIS_HOST,
    //   port: parseInt(env.REDIS_PORT, 10),
    //   ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
    //   retryStrategy: (times: number) => Math.min(times * 50, 2000),
    //   maxRetriesPerRequest: 3,
    // });

    // this.redis.on('connect', () => console.log('✅ Redis connected'));
    // this.redis.on('error',   (err: any) => console.error('❌ Redis error:', err));

    this._db   = db;
    this._pool = pool;

    this._cache           = new CacheService();
    this._jobService      = new JobService(this, this._cache);
    this._jobController   = new JobController(this._jobService);
    this._statsController = new StatsController(this._jobService);
    this._healthController = new HealthController(this);
    this._authController  = new AuthController(this._db);
    this._adminController = new AdminController(this);

    console.log(chalk.green('✓ Container initialized'));
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this._db.$connect();
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

  get db(): PrismaClient        { return this._db; }
  get pool(): Pool              { return this._pool; }
  get cache(): CacheService     { return this._cache; }
  get authController()          { return this._authController; }
  get jobService(): JobService  { return this._jobService; }
  get jobController()           { return this._jobController; }
  get statsController()         { return this._statsController; }
  get healthController()        { return this._healthController; }
  get adminController()         { return this._adminController; }

  async connect(): Promise<void> {
    try {
      await this._db.$connect();
      console.log(chalk.green('✓ Database connected'));
      await this._cache.connect();
      console.log(chalk.green('✓ Cache connected'));
    } catch (error) {
      console.error(chalk.red('❌ Connection failed:'), error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this._db.$disconnect();
      await this._cache.disconnect();
      console.log(chalk.green('✓ Disconnected'));
    } catch (error) {
      console.error(chalk.red('❌ Disconnect failed:'), error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  async healthCheck(): Promise<{ database: boolean; cache: boolean }> {
    try {
      const [dbHealth, cacheHealth] = await Promise.all([
        this._db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        this._cache.ping().then(() => true).catch(() => false),
      ]);
      return { database: dbHealth, cache: cacheHealth };
    } catch {
      return { database: false, cache: false };
    }
  }
}

export default Container.getInstance();