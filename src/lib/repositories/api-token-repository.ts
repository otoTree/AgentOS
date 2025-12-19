import { RedisRepository } from '@/lib/core/db/redis-repository';
import { ApiToken } from '@/lib/core/entities/auth';

export class ApiTokenRepository extends RedisRepository<ApiToken> {
  protected entityPrefix = 'api_token';

  constructor() {
    super();
  }

  protected async indexEntity(entity: ApiToken): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by token for fast lookup
    pipeline.set(`idx:api_token:${entity.token}`, entity.id);
    // Index by user for listing
    pipeline.zadd(`user:${entity.userId}:api_tokens`, entity.createdAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: ApiToken): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`idx:api_token:${entity.token}`);
    pipeline.zrem(`user:${entity.userId}:api_tokens`, entity.id);
    await pipeline.exec();
  }

  async findByToken(token: string): Promise<ApiToken | null> {
    const id = await this.redis.get(`idx:api_token:${token}`);
    if (!id) return null;
    return this.findById(id);
  }

  async findByUserId(userId: string): Promise<ApiToken[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:api_tokens`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const tokens: ApiToken[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        tokens.push(this.deserialize(data as any));
      }
    });
    return tokens;
  }
}

export const apiTokenRepository = new ApiTokenRepository();
