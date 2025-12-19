import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface User extends BaseEntity {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  username?: string;
  credits: number;
  storageLimit: number; // BigInt in Prisma, number in JS (Redis stores as string)
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
}

export interface Account extends BaseEntity {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface Session extends BaseEntity {
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface VerificationToken extends BaseEntity {
  identifier: string;
  token: string;
  expires: Date;
}

export interface ApiToken extends BaseEntity {
  userId: string;
  name: string;
  token: string; // Hashed or plain? Assuming plain/masked for display, hashed for verify? 
                 // Prisma usually stores just the string. 
                 // Let's assume simple string for now.
  lastUsedAt?: Date;
}
