import { createHash } from 'crypto';
import { Container } from './container';

export class CacheService {
    private memoryCache = new Map<string, { data: any; expiry: number; }>();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private container: Container) {
        this.cleanupInterval = setInterval(() => {
            this.cleanupMemory();
        }, 60000);
    }

    generateKey(prefix: string, params: Record<string, any> = {}): string {
        const sorted = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {} as Record<string, any>);

        const hash = createHash('md5')
            .update(JSON.stringify(sorted))
            .digest('hex')
            .slice(0, 16);

        return `${prefix}:${hash}`;
    }

    async get<T>(key: string): Promise<T | null> {
        const mem = this.memoryCache.get(key);
        if (mem && mem.expiry > Date.now()) {
            console.log(`⚡ Memory HIT: ${key}`);
            return mem.data as T;
        }

        try {
            const cached = await this.container.redis.get(key);
            if (cached) {
                console.log(`🎯 Redis HIT: ${key}`);
                const data = JSON.parse(cached);
                this.memoryCache.set(key, {
                    data,
                    expiry: Date.now() + 60000, // 1 min
                });
                return data as T;
            }
        } catch (error) {
            console.error('Cache GET error:', error);
        }

        console.log(`❌ Cache MISS: ${key}`);
        return null;
    }

    async set(key: string, value: any, ttl: number = 300): Promise<void> {
        try {
            this.memoryCache.set(key, {
                data: value,
                expiry: Date.now() + Math.min(ttl, 60) * 1000,
            });

            await this.container.redis.setex(key, ttl, JSON.stringify(value));
            console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error('Cache SET error:', error);
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.container.redis.keys(pattern);
            if (keys.length > 0) {
                await this.container.redis.del(...keys);
                console.log(`🗑️  Deleted ${keys.length} keys matching: ${pattern}`);
            }
            this.memoryCache.clear();
        } catch (error) {
            console.error('Cache DELETE error:', error);
        }
    }

    private cleanupMemory(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry <= now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired memory cache entries`);
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.memoryCache.clear();
    }
}
