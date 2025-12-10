import { redis, ensureRedisConnected } from './redis';
import { LRUCache } from 'lru-cache';

// Local Memory Cache (Level 1)
// Options for lru-cache v11
const localCache = new LRUCache<string, any>({
    max: 500, // Maximum number of items
    ttl: 1000 * 60 * 5, // 5 minutes default TTL
    allowStale: false,
});

export class CacheService {
    
    /**
     * Get data from cache (L1 -> L2 -> Fetch -> Store)
     * Handles Cache Penetration (store null/empty values) and Breakdown (mutex/locks - simplified here).
     * 
     * @param key Cache key
     * @param fetchFn Function to fetch data if cache miss
     * @param ttlSeconds TTL in seconds
     */
    static async get<T>(
        key: string, 
        fetchFn: () => Promise<T | null>, 
        ttlSeconds: number = 300
    ): Promise<T | null> {
        // 1. Check Local Cache (L1)
        if (localCache.has(key)) {
            // console.log(`[Cache] L1 Hit: ${key}`);
            return localCache.get(key) as T;
        }

        try {
            await ensureRedisConnected();
            
            // 2. Check Redis (L2)
            const cachedValue = await redis.get(key);
            if (cachedValue !== null) {
                // console.log(`[Cache] L2 Hit: ${key}`);
                const parsed = JSON.parse(cachedValue);
                
                // Populate L1
                // Note: lru-cache expects ttl in ms
                localCache.set(key, parsed, { ttl: ttlSeconds * 1000 });
                return parsed;
            }
        } catch (error) {
            console.error('[Cache] Redis get error:', error);
            // Fallback to fetchFn if Redis fails
        }

        // 3. Fetch from DB (Cache Miss)
        // console.log(`[Cache] Miss (fetching): ${key}`);
        // TODO: Add Mutex here to prevent Cache Breakdown (Thundering Herd) for hot keys
        const value = await fetchFn();

        if (value !== undefined) {
             // 4. Store in Cache
             // Cache Penetration Protection: Store null if value is null (with shorter TTL)
             const effectiveTtl = value === null ? 60 : ttlSeconds; // 1 min for empty results
             
             localCache.set(key, value, { ttl: effectiveTtl * 1000 });
             
             try {
                 await ensureRedisConnected();
                 const serialized = JSON.stringify(value);
                 await redis.setex(key, effectiveTtl, serialized);
             } catch (error) {
                 console.error('[Cache] Redis set error:', error);
             }
        }

        return value;
    }

    /**
     * Invalidate cache (L1 & L2)
     */
    static async del(key: string): Promise<void> {
        localCache.delete(key);
        try {
            await ensureRedisConnected();
            await redis.del(key);
        } catch (error) {
            console.error('[Cache] Redis del error:', error);
        }
    }

    /**
     * Set cache manually
     */
    static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        localCache.set(key, value, { ttl: ttlSeconds * 1000 });
        try {
            await ensureRedisConnected();
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            console.error('[Cache] Redis set error:', error);
        }
    }
    
    /**
     * Write-Behind strategy (Add to counter/list in Redis, async sync to DB)
     */
    static async increment(key: string, ttlSeconds: number = 3600): Promise<number> {
         try {
             await ensureRedisConnected();
             const val = await redis.incr(key);
             await redis.expire(key, ttlSeconds);
             return val;
         } catch (error) {
             console.error('[Cache] Redis incr error:', error);
             return 0;
         }
    }
}
