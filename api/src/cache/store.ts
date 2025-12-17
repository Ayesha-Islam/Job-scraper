import { Container } from '../container';
import { createHash } from 'crypto';

export class CacheService {
    private container: Container;
    private memoryCache = new Map<string, { data: any; expiry: number; }>();

    constructor(container: Container) {
        this.container = container;
        this.startCleanup();
    }

    // Generate cache key
    key(prefix: string, params: Record<string, any>): string {
        const hash = createHash('md5')
            .update(JSON.stringify(params))
            .digest('hex');
        return `${prefix}:${hash}`;
    }

    // Get from cache (memory first, then Redis)
    async get<T>(key: string): Promise<T | null> {
        // L1: Memory
        const mem = this.memoryCache.get(key);
        if (mem && mem.expiry > Date.now()) {
            console.log(`⚡ Memory HIT: ${key}`);
            return mem.data as T;
        }

        // L2: Redis
        try {
            const cached = await this.container.redis.get(key);
            if (cached) {
                console.log(`🎯 Redis HIT: ${key}`);
                const data = JSON.parse(cached);
                // Store in memory for fast access
                this.memoryCache.set(key, { data, expiry: Date.now() + 60000 });
                return data as T;
            }
        } catch (error) {
            console.error('Cache GET error:', error);
        }

        console.log(`❌ Cache MISS: ${key}`);
        return null;
    }

    // Set in cache (both layers)
    async set(key: string, value: any, ttl = 300): Promise<void> {
        try {
            // Memory cache (1 min)
            this.memoryCache.set(key, {
                data: value,
                expiry: Date.now() + Math.min(ttl, 60) * 1000,
            });

            // Redis cache
            await this.container.redis.setex(key, ttl, JSON.stringify(value));
            console.log(`💾 Cache SET: ${key}`);
        } catch (error) {
            console.error('Cache SET error:', error);
        }
    }

    // Delete pattern
    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.container.redis.keys(pattern);
            if (keys.length > 0) {
                await this.container.redis.del(...keys);
            }
            this.memoryCache.clear();
        } catch (error) {
            console.error('Cache DELETE error:', error);
        }
    }

    // Cleanup expired memory cache
    private startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.memoryCache.entries()) {
                if (value.expiry <= now) {
                    this.memoryCache.delete(key);
                }
            }
        }, 60000); // Every minute
    }
}