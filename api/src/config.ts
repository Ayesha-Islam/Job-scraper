import dotenv from 'dotenv'
import { Pool } from 'pg'
dotenv.config()

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: string
  DATABASE_URL: string
  REDIS_HOST: string
  REDIS_PORT: string
  REDIS_URL?: string
  REDIS_PASSWORD?: string
  ANTHROPIC_API_KEY?: string
  RESEND_API_KEY?: string
  ALERT_EMAIL?: string
  FROM_EMAIL?: string
  // ── Pool tunables (optional, have safe defaults) ──
  DB_POOL_MAX?: string
}

const missing = (k: string) => {
  throw new Error(`Missing required environment variable: ${k}`)
}

export const env: Env = {
  NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) ?? 'development',
  PORT: process.env.PORT ?? '3001',
  DATABASE_URL: process.env.DATABASE_URL ?? missing('DATABASE_URL'),
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: process.env.REDIS_PORT ?? '6379',
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ALERT_EMAIL: process.env.ALERT_EMAIL,
  FROM_EMAIL: process.env.FROM_EMAIL,
  DB_POOL_MAX: process.env.DB_POOL_MAX,
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // ── Explicit pool sizing (was using pg default of 10) ──────────────────────
  // Set DB_POOL_MAX in .env for production (recommended: 20–25).
  // Keep low locally to avoid exhausting dev Postgres connections.
  max: parseInt(env.DB_POOL_MAX ?? (env.NODE_ENV === 'production' ? '20' : '5'), 10),

  // ── Connection lifecycle ───────────────────────────────────────────────────
  // Release idle connections after 30s to avoid stale handles.
  idleTimeoutMillis: 30_000,

  // ── Acquisition timeout ────────────────────────────────────────────────────
  // Fail fast if the pool is exhausted — better a 503 than a hanging request.
  connectionTimeoutMillis: 5_000,
});

pool.on('connect', () => {
  console.log('Database pool: new client connected');
});

pool.on('error', (err) => {
  // Fatal idle-client error — log and exit so the process manager restarts cleanly.
  console.error('Unexpected error on idle pool client:', err);
  process.exit(-1);
});