import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface Email extends BaseEntity {
  userId: string;
  subject?: string;
  from: string;
  to: string;
  body?: string;
  html?: string;
  isRead: boolean;
  receivedAt: Date;
}
