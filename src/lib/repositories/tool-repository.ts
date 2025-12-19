import { RedisRepository } from '@/lib/core/db/redis-repository';
import { Tool } from '@/lib/core/entities/resources';

export class ToolRepository extends RedisRepository<Tool> {
  protected entityPrefix = 'tool';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Tool): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.sadd(`project:${entity.projectId}:tools`, entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Tool): Promise<void> {
      const pipeline = this.redis.pipeline();
      pipeline.srem(`project:${entity.projectId}:tools`, entity.id);
      await pipeline.exec();
  }

  async findByProjectId(projectId: string): Promise<Tool[]> {
      const ids = await this.redis.smembers(`project:${projectId}:tools`);
      if (ids.length === 0) return [];

      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();

      const tools: Tool[] = [];
      results?.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
              tools.push(this.deserialize(data as any));
          }
      });
      return tools;
  }
}

export const toolRepository = new ToolRepository();
