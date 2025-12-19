import { RedisRepository } from '@/lib/core/db/redis-repository';
import { User, Account, Session, VerificationToken } from '@/lib/core/entities/auth';

export class UserRepository extends RedisRepository<User> {
  protected entityPrefix = 'user';

  constructor() {
    super();
  }

  protected async indexEntity(entity: User): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.email) {
      pipeline.set(`idx:user:email:${entity.email}`, entity.id);
    }
    if (entity.username) {
      pipeline.set(`idx:user:username:${entity.username}`, entity.id);
    }
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: User): Promise<void> {
    const pipeline = this.redis.pipeline();
    if (entity.email) {
      pipeline.del(`idx:user:email:${entity.email}`);
    }
    if (entity.username) {
      pipeline.del(`idx:user:username:${entity.username}`);
    }
    await pipeline.exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = await this.redis.get(`idx:user:email:${email}`);
    if (!id) return null;
    return this.findById(id);
  }

  async findByUsername(username: string): Promise<User | null> {
    const id = await this.redis.get(`idx:user:username:${username}`);
    if (!id) return null;
    return this.findById(id);
  }
}

export class AccountRepository extends RedisRepository<Account> {
  protected entityPrefix = 'account';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Account): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Index by provider + providerAccountId
    pipeline.set(`idx:account:${entity.provider}:${entity.providerAccountId}`, entity.id);
    // Index by user
    pipeline.sadd(`user:${entity.userId}:accounts`, entity.id);
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Account): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`idx:account:${entity.provider}:${entity.providerAccountId}`);
    pipeline.srem(`user:${entity.userId}:accounts`, entity.id);
    await pipeline.exec();
  }

  async findByProvider(provider: string, providerAccountId: string): Promise<Account | null> {
    const id = await this.redis.get(`idx:account:${provider}:${providerAccountId}`);
    if (!id) return null;
    return this.findById(id);
  }

  async findByUserId(userId: string): Promise<Account[]> {
    const ids = await this.redis.smembers(`user:${userId}:accounts`);
    if (ids.length === 0) return [];
    
    const pipeline = this.redis.pipeline();
    ids.forEach(id => pipeline.hgetall(this.getKey(id)));
    const results = await pipeline.exec();

    const accounts: Account[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data && Object.keys(data).length > 0) {
        accounts.push(this.deserialize(data as any));
      }
    });
    return accounts;
  }
}

export class SessionRepository extends RedisRepository<Session> {
  protected entityPrefix = 'session';

  constructor() {
    super();
  }

  protected async indexEntity(entity: Session): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`idx:session:${entity.sessionToken}`, entity.id);
    pipeline.sadd(`user:${entity.userId}:sessions`, entity.id);
    
    // Set TTL on the session key itself if we wanted automatic expiration, 
    // but NextAuth handles expiration checks. 
    // However, for Redis cleanup, it's good practice.
    // Calculate TTL in seconds
    const ttl = Math.max(0, Math.floor((entity.expires.getTime() - Date.now()) / 1000));
    if (ttl > 0) {
        pipeline.expire(this.getKey(entity.id), ttl);
        pipeline.expire(`idx:session:${entity.sessionToken}`, ttl);
    }
    
    await pipeline.exec();
  }

  protected async cleanupIndexes(entity: Session): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`idx:session:${entity.sessionToken}`);
    pipeline.srem(`user:${entity.userId}:sessions`, entity.id);
    await pipeline.exec();
  }

  async findBySessionToken(sessionToken: string): Promise<Session | null> {
    const id = await this.redis.get(`idx:session:${sessionToken}`);
    if (!id) return null;
    return this.findById(id);
  }
}

export class VerificationTokenRepository extends RedisRepository<VerificationToken> {
  // VerificationToken in Prisma has composite key, here we use generated ID 
  // or use identifier:token as key. Let's stick to repository pattern.
  protected entityPrefix = 'verification_token';

  protected async indexEntity(entity: VerificationToken): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`idx:vt:${entity.identifier}:${entity.token}`, entity.id);
    await pipeline.exec();
  }

  async findByIdentifierAndToken(identifier: string, token: string): Promise<VerificationToken | null> {
     const id = await this.redis.get(`idx:vt:${identifier}:${token}`);
     if (!id) return null;
     return this.findById(id);
  }
  
  async deleteByIdentifierAndToken(identifier: string, token: string): Promise<void> {
      const id = await this.redis.get(`idx:vt:${identifier}:${token}`);
      if (id) {
          await this.delete(id);
          await this.redis.del(`idx:vt:${identifier}:${token}`);
      }
  }
}

export const userRepository = new UserRepository();
export const accountRepository = new AccountRepository();
export const sessionRepository = new SessionRepository();
export const verificationTokenRepository = new VerificationTokenRepository();
