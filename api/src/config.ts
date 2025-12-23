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
  FROM_EMAIL: process.env.FROM_EMAIL
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});