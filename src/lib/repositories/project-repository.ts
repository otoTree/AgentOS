import { RedisRepository } from '@/lib/core/db/redis-repository';
import { Project, Deployment } from '@/lib/core/entities/project';

export class ProjectRepository extends RedisRepository<Project> {
  protected entityPrefix = 'project';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Project): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(`user:${entity.userId}:projects`, entity.updatedAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Project): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:projects`, entity.id);
    await pipeline.exec();
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:projects`, 0, -1);
    if (ids.length === 0) return [];
    
    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const projects: Project[] = [];
    results?.forEach(([err, data]) => {
        if (!err && data && Object.keys(data).length > 0) {
            projects.push(this.deserialize(data as any));
        }
    });
    return projects;
  }
}

export class DeploymentRepository extends RedisRepository<Deployment> {
  protected entityPrefix = 'deployment';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Deployment): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by Project
    pipeline.zadd(`project:${entity.projectId}:deployments`, entity.createdAt.getTime(), entity.id);
    
    // Index active public deployments for marketplace
    if (entity.isActive && entity.accessType === 'PUBLIC') {
        pipeline.zadd(`marketplace:deployments:public`, entity.createdAt.getTime(), entity.id);
    }
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Deployment): Promise<void> {
      const pipeline = this.redis.pipeline();
      pipeline.zrem(`project:${entity.projectId}:deployments`, entity.id);
      pipeline.zrem(`marketplace:deployments:public`, entity.id);
      await pipeline.exec();
  }

  async findByProjectId(projectId: string): Promise<Deployment[]> {
      const ids = await this.redis.zrevrange(`project:${projectId}:deployments`, 0, -1);
      if (ids.length === 0) return [];

      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();

      const deployments: Deployment[] = [];
      results?.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
              deployments.push(this.deserialize(data as any));
          }
      });
      return deployments;
  }

  async findPublic(): Promise<Deployment[]> {
      const ids = await this.redis.zrevrange(`marketplace:deployments:public`, 0, -1);
      if (ids.length === 0) return [];

      const pipeline = this.redis.pipeline();
      ids.forEach(id => pipeline.hgetall(this.getKey(id)));
      const results = await pipeline.exec();

      const deployments: Deployment[] = [];
      results?.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
              deployments.push(this.deserialize(data as any));
          }
      });
      return deployments;
  }
}

export const projectRepository = new ProjectRepository();
export const deploymentRepository = new DeploymentRepository();
