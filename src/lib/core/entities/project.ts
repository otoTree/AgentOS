import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  avatar?: string;
  category: string;
  userId: string;
}

export interface Deployment extends BaseEntity {
  projectId: string;
  toolId?: string;
  snapshotCode: string;
  storageKey?: string;
  inputs: any;
  isActive: boolean;
  accessType: 'PUBLIC' | 'PRIVATE';
  callCount: number;
  lastCalled?: Date;
  knowledgeBaseCollectionId?: string;
}

export interface ProjectMessage extends BaseEntity {
    projectId: string;
    toolId?: string;
    role: string;
    content: string;
}

export interface Comment extends BaseEntity {
  projectId: string;
  userId: string;
  content: string;
}
