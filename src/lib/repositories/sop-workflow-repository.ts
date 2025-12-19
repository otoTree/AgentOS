import { RedisRepository } from '@/lib/core/db/redis-repository';
import { SopWorkflow } from '@/lib/core/entities/sop';

export class SopWorkflowRepository extends RedisRepository<SopWorkflow> {
  protected entityPrefix = 'sop_workflow';

  constructor() {
    super();
  }

  protected async indexEntity(entity: SopWorkflow): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by user: sorted by updatedAt
    pipeline.zadd(`user:${entity.userId}:sop_workflows`, entity.updatedAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: SopWorkflow): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:sop_workflows`, entity.id);
    await pipeline.exec();
  }

  async findByUserId(userId: string): Promise<SopWorkflow[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:sop_workflows`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const workflows: SopWorkflow[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        workflows.push(this.deserialize(data as any));
      }
    });

    return workflows;
  }
}

export const sopWorkflowRepository = new SopWorkflowRepository();
