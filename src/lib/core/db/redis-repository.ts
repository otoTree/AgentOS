import { redis } from '@/lib/infra/redis';
import { v4 as uuidv4 } from 'uuid';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export abstract class RedisRepository<T extends BaseEntity> {
  protected abstract entityPrefix: string;
  protected redis = redis;

  constructor() {}

  /**
   * Generates a unique key for the entity
   */
  protected getKey(id: string): string {
    return `${this.entityPrefix}:${id}`;
  }

  /**
   * Generates a new ID (UUID v4)
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Serializes the entity to a flat object for Redis Hash
   * Handles Date objects and JSON fields
   */
  protected serialize(entity: Partial<T>): Record<string, string | number> {
    const serialized: Record<string, string | number> = {};
    
    for (const [key, value] of Object.entries(entity)) {
      if (value === null || value === undefined) continue;

      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        serialized[key] = JSON.stringify(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  /**
   * Deserializes Redis Hash data to Entity
   */
  protected deserialize(data: Record<string, string>): T {
    const entity: any = { ...data };
    
    // You might want to override this in subclasses to handle specific fields
    // For now, we attempt to parse JSON and Dates heuristically or rely on subclass implementation
    
    // Common fields
    if (entity.createdAt) entity.createdAt = new Date(entity.createdAt);
    if (entity.updatedAt) entity.updatedAt = new Date(entity.updatedAt);
    
    return entity as T;
  }

  async findById(id: string): Promise<T | null> {
    const data = await this.redis.hgetall(this.getKey(id));
    if (!data || Object.keys(data).length === 0) return null;
    return this.deserialize(data);
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const id = this.generateId();
    const now = new Date();
    
    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as T;

    const serialized = this.serialize(entity);
    await this.redis.hmset(this.getKey(id), serialized);
    
    // Hook for secondary indexes
    await this.indexEntity(entity);

    return entity;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    const key = this.getKey(id);
    const exists = await this.redis.exists(key);
    if (!exists) throw new Error(`Entity ${id} not found`);

    const updates = {
      ...data,
      updatedAt: new Date(),
    };

    const serialized = this.serialize(updates as Partial<T>);
    await this.redis.hmset(key, serialized);

    // Fetch updated entity
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
      await this.cleanupIndexes(entity);
      await this.redis.del(this.getKey(id));
    }
  }

  // Hook methods for indexing
  protected async indexEntity(entity: T): Promise<void> {
    // Override to add indexes
  }

  protected async cleanupIndexes(entity: T): Promise<void> {
    // Override to remove indexes
  }
}
