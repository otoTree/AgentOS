import { RedisRepository } from '@/lib/core/db/redis-repository';
import { Folder } from '@/lib/core/entities/filesystem';
import { fileRepository } from './file-repository';

export class FolderRepository extends RedisRepository<Folder> {
  protected entityPrefix = 'folder';

  constructor() {
    super();
  }

  // Basic index for findByNameAndParent
  protected async indexEntity(entity: Folder): Promise<void> {
    const parentId = entity.parentId || 'root';
    await this.redis.hset(
      `user:${entity.userId}:folders:${parentId}`,
      entity.name,
      entity.id
    );
  }

  protected async cleanupIndexes(entity: Folder): Promise<void> {
    const parentId = entity.parentId || 'root';
    await this.redis.hdel(
      `user:${entity.userId}:folders:${parentId}`,
      entity.name
    );
  }

  async findByNameAndParent(userId: string, name: string, parentId: string | null): Promise<Folder | null> {
    const pId = parentId || 'root';
    const id = await this.redis.hget(`user:${userId}:folders:${pId}`, name);
    if (!id) return null;
    return this.findById(id);
  }

  async findChildren(userId: string, parentId: string | null): Promise<Folder[]> {
      const pId = parentId || 'root';
      const map = await this.redis.hgetall(`user:${userId}:folders:${pId}`);
      if (!map || Object.keys(map).length === 0) return [];
      
      const ids = Object.values(map);
      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();

      const folders: Folder[] = [];
      results?.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
              folders.push(this.deserialize(data as any));
          }
      });
      return folders;
  }

  async deleteRecursive(id: string, userId: string): Promise<void> {
      // 1. Delete all files in this folder
      await fileRepository.deleteByFolder(userId, id);

      // 2. Find all child folders
      const children = await this.findChildren(userId, id);
      
      // 3. Recursively delete children
      for (const child of children) {
          await this.deleteRecursive(child.id, userId);
      }

      // 4. Delete the folder itself
      await this.delete(id);
  }
}

export const folderRepository = new FolderRepository();
