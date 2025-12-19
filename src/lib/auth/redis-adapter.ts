import { Adapter } from "next-auth/adapters";
import { 
    userRepository, 
    accountRepository, 
    sessionRepository, 
    verificationTokenRepository 
} from "@/lib/repositories/auth-repository";

export function RedisAdapter(): Adapter {
  return {
    async createUser(user) {
      const created = await userRepository.create({
          ...user,
          credits: 100, // Default
          storageLimit: 1073741824, // 1GB
      });
      return created as any;
    },
    async getUser(id) {
      const user = await userRepository.findById(id);
      if (!user) return null;
      return user as any;
    },
    async getUserByEmail(email) {
      const user = await userRepository.findByEmail(email);
      if (!user) return null;
      return user as any;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await accountRepository.findByProvider(provider, providerAccountId);
      if (!account) return null;
      const user = await userRepository.findById(account.userId);
      return user as any;
    },
    async updateUser(user) {
      if (!user.id) throw new Error("User ID required for update");
      const updated = await userRepository.update(user.id, user);
      return updated as any;
    },
    async deleteUser(userId) {
      // In a real app, you might want to cascade delete or soft delete
      // Here we just delete the user
      await userRepository.delete(userId);
    },
    async linkAccount(account) {
        // @ts-ignore - next-auth types might be slightly mismatched with our strict types
        await accountRepository.create(account);
        return account as any;
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const account = await accountRepository.findByProvider(provider, providerAccountId);
      if (account) {
          await accountRepository.delete(account.id);
      }
    },
    async createSession(session) {
      const created = await sessionRepository.create({
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
      });
      return created as any;
    },
    async getSessionAndUser(sessionToken) {
      const session = await sessionRepository.findBySessionToken(sessionToken);
      if (!session) return null;
      const user = await userRepository.findById(session.userId);
      if (!user) return null;
      return { session: session as any, user: user as any };
    },
    async updateSession(session) {
      const existing = await sessionRepository.findBySessionToken(session.sessionToken);
      if (!existing) return null;
      const updated = await sessionRepository.update(existing.id, session);
      return updated as any;
    },
    async deleteSession(sessionToken) {
      const session = await sessionRepository.findBySessionToken(sessionToken);
      if (session) {
          await sessionRepository.delete(session.id);
      }
    },
    async createVerificationToken(verificationToken) {
      const created = await verificationTokenRepository.create(verificationToken);
      return created as any;
    },
    async useVerificationToken({ identifier, token }) {
      const verificationToken = await verificationTokenRepository.findByIdentifierAndToken(identifier, token);
      if (!verificationToken) return null;
      await verificationTokenRepository.deleteByIdentifierAndToken(identifier, token);
      return verificationToken as any;
    },
  };
}
