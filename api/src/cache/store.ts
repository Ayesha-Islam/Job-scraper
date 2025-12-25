import { createHash } from 'crypto';


export class CacheService {
    private memoryCache = new Map<string, { data: any; expiry: number; }>();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private container: any) {
        this.cleanupInterval = setInterval(() => this.cleanupMemory(), 60000);
    }

    async connect() { }
    async disconnect() { this.destroy(); }
    async ping() { return this.container.redis.ping(); }
    generateKey(prefix: string, params: Record<string, any> = {}): string {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {} as Record<string, any>);

        const hash = createHash('md5')
            .update(JSON.stringify(sortedParams))
            .digest('hex')
            .slice(0, 16);

        return `${prefix}:${hash}`;
    }

    async get<T>(key: string): Promise<T | null> {
        const mem = this.memoryCache.get(key);
        if (mem && mem.expiry > Date.now()) {
            return mem.data as T;
        }

        try {
            const cached = await this.container.redis.get(key);
            if (cached) {
                const data = JSON.parse(cached);
                this.memoryCache.set(key, {
                    data,
                    expiry: Date.now() + 60000,
                });
                return data as T;
            }
        } catch (error) {
            console.error(`[Cache] Redis GET error for ${key}:`, error);
        }

        return null;
    }

    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try {
            this.memoryCache.set(key, {
                data: value,
                expiry: Date.now() + Math.min(ttlSeconds, 60) * 1000,
            });

            await this.container.redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            console.error(`[Cache] SET error for ${key}:`, error);
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.container.redis.keys(pattern);
            if (keys.length > 0) {
                await this.container.redis.del(...keys);
            }
            this.memoryCache.clear();
        } catch (error) {
            console.error(`[Cache] DELETE error for pattern ${pattern}:`, error);
        }
    }

    private cleanupMemory(): void {
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.memoryCache.clear();
    }
}