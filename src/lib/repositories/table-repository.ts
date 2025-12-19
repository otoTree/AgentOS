import { RedisRepository } from '@/lib/core/db/redis-repository';
import { TableDocument } from '@/lib/core/entities/resources';
import { s3Client, BUCKET_NAME } from '@/lib/storage/s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export class TableRepository extends RedisRepository<TableDocument> {
  protected entityPrefix = 'table_document';

  constructor() {
    super();
  }

  protected async indexEntity(entity: TableDocument): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(`user:${entity.userId}:tables`, entity.updatedAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: TableDocument): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:tables`, entity.id);
    await pipeline.exec();
  }

  // Override create to offload content to S3
  async create(data: Omit<TableDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<TableDocument> {
    const id = this.generateId();
    const now = new Date();
    
    // Construct S3 Key: user specific folder
    const s3Key = `users/${data.userId}/tables/${id}.json`;
    
    // Upload content to S3
    if (data.content) {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: JSON.stringify(data.content),
            ContentType: 'application/json'
        }));
    }

    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      s3Key,
      content: undefined // Do not store content in Redis
    } as TableDocument;

    const serialized = this.serialize(entity);
    await this.redis.hmset(this.getKey(id), serialized);
    
    await this.indexEntity(entity);

    // Return entity with content (for the caller)
    return { ...entity, content: data.content };
  }

  // Override update to handle content changes
  async update(id: string, data: Partial<Omit<TableDocument, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TableDocument> {
    const key = this.getKey(id);
    const exists = await this.redis.exists(key);
    if (!exists) throw new Error(`Entity ${id} not found`);

    const existingEntity = await this.findById(id); // This will fetch content from S3 if needed, but we optimize below
    if (!existingEntity) throw new Error(`Entity ${id} not found`);

    const updates: any = {
      ...data,
      updatedAt: new Date(),
    };

    // If content is being updated, upload to S3
    if (data.content !== undefined) {
        const s3Key = existingEntity.s3Key || `users/${existingEntity.userId}/tables/${id}.json`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: JSON.stringify(data.content),
            ContentType: 'application/json'
        }));
        
        updates.s3Key = s3Key;
        updates.content = undefined; // Do not store in Redis
    }

    const serialized = this.serialize(updates as Partial<TableDocument>);
    await this.redis.hmset(key, serialized);

    // Fetch updated entity (and merge content if we just updated it)
    const updated = await this.findById(id);
    if (data.content !== undefined && updated) {
        updated.content = data.content;
    }
    
    return updated!;
  }

  // Override findById to fetch content from S3
  async findById(id: string): Promise<TableDocument | null> {
    const data = await this.redis.hgetall(this.getKey(id));
    if (!data || Object.keys(data).length === 0) return null;
    
    const entity = this.deserialize(data);
    
    if (entity.s3Key) {
        try {
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: entity.s3Key
            }));
            
            if (response.Body) {
                const str = await response.Body.transformToString();
                entity.content = JSON.parse(str);
            }
        } catch (error) {
            console.error(`Failed to fetch content from S3 for table ${id}:`, error);
            // We return the entity without content if S3 fails, or could throw
            // For now, let's return it as is (content undefined)
        }
    }
    
    return entity;
  }

  // Override delete to remove from S3
  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
        if (entity.s3Key) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: entity.s3Key
                }));
            } catch (error) {
                console.error(`Failed to delete content from S3 for table ${id}:`, error);
            }
        }
        
        await this.cleanupIndexes(entity);
        await this.redis.del(this.getKey(id));
    }
  }

  async findByUserId(userId: string): Promise<TableDocument[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:tables`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const tables: TableDocument[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        tables.push(this.deserialize(data as any));
      }
    });
    // Note: findByUserId usually lists tables, so we MIGHT NOT want to fetch heavy content for all of them.
    // The current implementation of GET /api/tables only maps id/name/dates.
    // So we DO NOT fetch content here to save bandwidth/latency.
    return tables;
  }
}

export const tableRepository = new TableRepository();
