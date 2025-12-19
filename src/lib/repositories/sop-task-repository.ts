import { RedisRepository } from '@/lib/core/db/redis-repository';
import { SopTask } from '@/lib/core/entities/sop';

export class SopTaskRepository extends RedisRepository<SopTask> {
  protected entityPrefix = 'sop_task';

  constructor() {
    super();
  }

  protected async indexEntity(entity: SopTask): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by execution (ordered by creation time mostly, or explicitly by list)
    pipeline.rpush(`sop_execution:${entity.executionId}:tasks`, entity.id);
    
    // Index by assignee for human tasks
    if (entity.assignedToUserId) {
        pipeline.zadd(`user:${entity.assignedToUserId}:assigned_tasks`, entity.createdAt.getTime(), entity.id);
    }
    await pipeline.exec();
  }
  
  protected async cleanupIndexes(entity: SopTask): Promise<void> {
    // Note: removing from list by value is O(N)
    const pipeline = this.redis.pipeline();
    pipeline.lrem(`sop_execution:${entity.executionId}:tasks`, 0, entity.id);
    if (entity.assignedToUserId) {
        pipeline.zrem(`user:${entity.assignedToUserId}:assigned_tasks`, entity.id);
    }
    await pipeline.exec();
  }

  async findByExecutionId(executionId: string): Promise<SopTask[]> {
    const ids = await this.redis.lrange(`sop_execution:${executionId}:tasks`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const tasks: SopTask[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        tasks.push(this.deserialize(data as any));
      }
    });
    return tasks;
  }
}

export const sopTaskRepository = new SopTaskRepository();
