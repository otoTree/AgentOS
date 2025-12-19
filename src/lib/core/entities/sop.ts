import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface SopWorkflow extends BaseEntity {
  name: string;
  description?: string;
  graph: any; // Json graph definition
  userId: string;
  deployed: boolean;
}

export interface SopExecution extends BaseEntity {
  workflowId?: string;
  userId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUSPENDED';
  context: any; // Json
  deliverables?: any; // Json
  currentNodeId?: string;
}

export interface SopTask extends BaseEntity {
  executionId: string;
  nodeId: string;
  type: string; // INTERACT, REASONING, ACTION, AGENT (HUMAN)
  name?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'WAITING_FOR_HUMAN';
  input?: any;
  output?: any;
  ownerId: string; // User who owns the task (usually creator of execution)
  assignedToUserId?: string; // For Human Tasks
}
