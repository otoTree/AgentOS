import { RedisRepository } from '@/lib/core/db/redis-repository';
import { SopExecution } from '@/lib/core/entities/sop';

export class SopExecutionRepository extends RedisRepository<SopExecution> {
  protected entityPrefix = 'sop_execution';

  constructor() {
    super();
  }

  protected async indexEntity(entity: SopExecution): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by user
    pipeline.zadd(`user:${entity.userId}:sop_executions`, entity.updatedAt.getTime(), entity.id);
    
    // Index by workflow
    if (entity.workflowId) {
      pipeline.zadd(`sop_workflow:${entity.workflowId}:executions`, entity.updatedAt.getTime(), entity.id);
    }
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: SopExecution): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:sop_executions`, entity.id);
    if (entity.workflowId) {
      pipeline.zrem(`sop_workflow:${entity.workflowId}:executions`, entity.id);
    }
    await pipeline.exec();
  }

  async findByWorkflowId(workflowId: string): Promise<SopExecution[]> {
    const ids = await this.redis.zrevrange(`sop_workflow:${workflowId}:executions`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const executions: SopExecution[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        executions.push(this.deserialize(data as any));
      }
    });
    return executions;
  }
}

export const sopExecutionRepository = new SopExecutionRepository();
