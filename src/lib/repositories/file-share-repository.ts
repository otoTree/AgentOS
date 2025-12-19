import { RedisRepository } from '@/lib/core/db/redis-repository';
import { FileShare } from '@/lib/core/entities/filesystem';

export class FileShareRepository extends RedisRepository<FileShare> {
  protected entityPrefix = 'fileshare';

  constructor() {
    super();
  }

  protected async indexEntity(entity: FileShare): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.token) {
        pipeline.set(`idx:fileshare:token:${entity.token}`, entity.id);
    }
    // Index by fileId
    pipeline.sadd(`file:${entity.fileId}:shares`, entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: FileShare): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.token) {
        pipeline.del(`idx:fileshare:token:${entity.token}`);
    }
    pipeline.srem(`file:${entity.fileId}:shares`, entity.id);
    await pipeline.exec();
  }

  async findByToken(token: string): Promise<FileShare | null> {
      const id = await this.redis.get(`idx:fileshare:token:${token}`);
      if (!id) return null;
      return this.findById(id);
  }

  async findByFileId(fileId: string): Promise<FileShare[]> {
      const ids = await this.redis.smembers(`file:${fileId}:shares`);
      if (ids.length === 0) return [];

      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();

      const shares: FileShare[] = [];
      results?.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
              shares.push(this.deserialize(data as any));
          }
      });
      return shares;
  }
}

export const fileShareRepository = new FileShareRepository();
