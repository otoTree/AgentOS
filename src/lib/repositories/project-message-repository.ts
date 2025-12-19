import { RedisRepository } from '@/lib/core/db/redis-repository';
import { ProjectMessage } from '@/lib/core/entities/project';

export class ProjectMessageRepository extends RedisRepository<ProjectMessage> {
  protected entityPrefix = 'project_message';

  constructor() {
    super();
  }

  protected async indexEntity(entity: ProjectMessage): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.toolId) {
        pipeline.zadd(`tool:${entity.toolId}:messages`, entity.createdAt.getTime(), entity.id);
    }
    pipeline.zadd(`project:${entity.projectId}:messages`, entity.createdAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: ProjectMessage): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.toolId) {
        pipeline.zrem(`tool:${entity.toolId}:messages`, entity.id);
    }
    pipeline.zrem(`project:${entity.projectId}:messages`, entity.id);
    await pipeline.exec();
  }

  async findByToolId(toolId: string): Promise<ProjectMessage[]> {
    const ids = await this.redis.zrange(`tool:${toolId}:messages`, 0, -1);
    if (ids.length === 0) return [];
    
    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const messages: ProjectMessage[] = [];
    results?.forEach(([err, data]) => {
        if (!err && data && Object.keys(data).length > 0) {
            messages.push(this.deserialize(data as any));
        }
    });
    return messages;
  }
}

export const projectMessageRepository = new ProjectMessageRepository();
