import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface Tool extends BaseEntity {
  name: string;
  description?: string;
  code: string;
  storageKey?: string;
  inputs: any; // Json
  projectId: string;
}

export interface File extends BaseEntity {
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  content?: string;
  userId: string;
  folderId?: string;
}

export interface TableDocument extends BaseEntity {
  name: string;
  content?: any; // JSON
  s3Key?: string;
  userId: string;
}
