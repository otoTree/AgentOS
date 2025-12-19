import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface Folder extends BaseEntity {
  name: string;
  parentId?: string;
  userId: string;
}

export interface FileShare extends BaseEntity {
  fileId: string;
  isPublic: boolean;
  token?: string;
  sharedWithUserId?: string;
  expiresAt?: Date;
}
