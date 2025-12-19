import { RedisRepository } from '@/lib/core/db/redis-repository';
import { DataSource, DataSourceTable, DataSourceColumn } from '@/lib/core/entities/datasource';

export class DataSourceRepository extends RedisRepository<DataSource> {
  protected entityPrefix = 'datasource';

  constructor() {
    super();
  }

  protected async indexEntity(entity: DataSource): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(`user:${entity.userId}:datasources`, entity.createdAt.getTime(), entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: DataSource): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(`user:${entity.userId}:datasources`, entity.id);
    await pipeline.exec();
  }

  async findByUserId(userId: string): Promise<DataSource[]> {
    const ids = await this.redis.zrevrange(`user:${userId}:datasources`, 0, -1);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const sources: DataSource[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        sources.push(this.deserialize(data as any));
      }
    });
    return sources;
  }
}

export class DataSourceTableRepository extends RedisRepository<DataSourceTable> {
  protected entityPrefix = 'ds_table';

  constructor() {
    super();
  }

  protected async indexEntity(entity: DataSourceTable): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.sadd(`datasource:${entity.dataSourceId}:tables`, entity.id);
    // Unique name per datasource
    pipeline.set(`idx:ds:${entity.dataSourceId}:table:${entity.name}`, entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: DataSourceTable): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.srem(`datasource:${entity.dataSourceId}:tables`, entity.id);
    pipeline.del(`idx:ds:${entity.dataSourceId}:table:${entity.name}`);
    await pipeline.exec();
  }

  async findByDataSourceId(dataSourceId: string): Promise<DataSourceTable[]> {
    const ids = await this.redis.smembers(`datasource:${dataSourceId}:tables`);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const tables: DataSourceTable[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        tables.push(this.deserialize(data as any));
      }
    });
    return tables;
  }

  async findByName(dataSourceId: string, name: string): Promise<DataSourceTable | null> {
      const id = await this.redis.get(`idx:ds:${dataSourceId}:table:${name}`);
      if (!id) return null;
      return this.findById(id);
  }
}

export class DataSourceColumnRepository extends RedisRepository<DataSourceColumn> {
  protected entityPrefix = 'ds_column';

  constructor() {
    super();
  }

  protected async indexEntity(entity: DataSourceColumn): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.sadd(`table:${entity.tableId}:columns`, entity.id);
    // Unique name per table
    pipeline.set(`idx:table:${entity.tableId}:column:${entity.name}`, entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: DataSourceColumn): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.srem(`table:${entity.tableId}:columns`, entity.id);
    pipeline.del(`idx:table:${entity.tableId}:column:${entity.name}`);
    await pipeline.exec();
  }

  async findByTableId(tableId: string): Promise<DataSourceColumn[]> {
    const ids = await this.redis.smembers(`table:${tableId}:columns`);
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const columns: DataSourceColumn[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        columns.push(this.deserialize(data as any));
      }
    });
    return columns;
  }

  async findByName(tableId: string, name: string): Promise<DataSourceColumn | null> {
      const id = await this.redis.get(`idx:table:${tableId}:column:${name}`);
      if (!id) return null;
      return this.findById(id);
  }
}

export const dataSourceRepository = new DataSourceRepository();
export const dataSourceTableRepository = new DataSourceTableRepository();
export const dataSourceColumnRepository = new DataSourceColumnRepository();
