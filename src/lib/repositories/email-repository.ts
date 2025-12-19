import { RedisRepository } from '@/lib/core/db/redis-repository';
import { Email } from '@/lib/core/entities/email';

export class EmailRepository extends RedisRepository<Email> {
  protected entityPrefix = 'email';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Email): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by user: sorted by receivedAt
    pipeline.zadd(`user:${entity.userId}:emails`, entity.receivedAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Email): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:emails`, entity.id);
    await pipeline.exec();
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Email[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:emails`, offset, offset + limit - 1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const emails: Email[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        emails.push(this.deserialize(data as any));
      }
    });
    return emails;
  }
}

export const emailRepository = new EmailRepository();
