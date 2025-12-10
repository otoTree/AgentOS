import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately upon instantiation
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Helper to check connection status
export async function ensureRedisConnected() {
    if (redis.status === 'ready' || redis.status === 'connecting') return;
    try {
        await redis.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // We don't throw here to allow the app to function without Redis (degraded mode) if desired
        // But for this task, we assume Redis is critical.
    }
}
