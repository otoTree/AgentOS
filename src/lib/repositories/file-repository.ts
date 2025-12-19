import { RedisRepository } from '@/lib/core/db/redis-repository';
import { File } from '@/lib/core/entities/resources';

export class FileRepository extends RedisRepository<File> {
  protected entityPrefix = 'file';

  constructor() {
    super();
  }

  protected async indexEntity(entity: File): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by folder (for listing files in a folder)
    const folderId = entity.folderId || 'root';
    pipeline.sadd(`user:${entity.userId}:files:${folderId}`, entity.id);
    
    // Index by user (for calculating storage usage or listing all files)
    pipeline.sadd(`user:${entity.userId}:all_files`, entity.id);
    
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: File): Promise<void> {
    const pipeline = this.redis.pipeline();
    const folderId = entity.folderId || 'root';
    pipeline.srem(`user:${entity.userId}:files:${folderId}`, entity.id);
    pipeline.srem(`user:${entity.userId}:all_files`, entity.id);
    await pipeline.exec();
  }

  async findByFolder(userId: string, folderId: string | null): Promise<File[]> {
    const fId = folderId || 'root';
    const ids = await this.redis.smembers(`user:${userId}:files:${fId}`);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const files: File[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        files.push(this.deserialize(data as any));
      }
    });
    return files;
  }

  async findByUserId(userId: string): Promise<File[]> {
      const ids = await this.redis.smembers(`user:${userId}:all_files`);
      if (ids.length === 0) return [];
  
      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();
  
      const files: File[] = [];
      results?.forEach(([err, data]) => {
        if (!err && data && Object.keys(data).length > 0) {
          files.push(this.deserialize(data as any));
        }
      });
      return files;
  }

  async deleteByFolder(userId: string, folderId: string | null): Promise<void> {
    const files = await this.findByFolder(userId, folderId);
    for (const file of files) {
        await this.delete(file.id);
    }
  }

  async search(userId: string, query: string, folderId?: string | null): Promise<File[]> {
      // Redis doesn't support full-text search without RediSearch module.
      // For now, we fetch all relevant files and filter in memory.
      // Ideally, we would use a secondary index or RediSearch.
      
      let files: File[];
      if (folderId !== undefined) {
          files = await this.findByFolder(userId, folderId);
      } else {
          files = await this.findByUserId(userId);
      }

      const lowerQuery = query.toLowerCase();
      return files.filter(f => 
          f.name.toLowerCase().includes(lowerQuery) || 
          (f.content && f.content.toLowerCase().includes(lowerQuery))
      );
  }
}

export const fileRepository = new FileRepository();
