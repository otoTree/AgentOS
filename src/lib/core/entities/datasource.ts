import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface DataSource extends BaseEntity {
  name: string;
  type: string;
  config: any; // DBConfig
  userId: string;
}

export interface DataSourceTable extends BaseEntity {
  name: string;
  description?: string;
  dataSourceId: string;
}

export interface DataSourceColumn extends BaseEntity {
  name: string;
  type: string;
  description?: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  tableId: string;
}
