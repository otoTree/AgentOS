import { RedisRepository } from '@/lib/core/db/redis-repository';
import { Comment } from '@/lib/core/entities/project';

export class CommentRepository extends RedisRepository<Comment> {
  protected entityPrefix = 'comment';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Comment): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(`project:${entity.projectId}:comments`, entity.createdAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Comment): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`project:${entity.projectId}:comments`, entity.id);
    await pipeline.exec();
  }

  async findByProjectId(projectId: string): Promise<Comment[]> {
    const ids = await this.redis.zrevrange(`project:${projectId}:comments`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const comments: Comment[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        comments.push(this.deserialize(data as any));
      }
    });
    return comments;
  }
}

export const commentRepository = new CommentRepository();
