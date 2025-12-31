import { eq } from 'drizzle-orm';
import { db } from '../../database';
import { fileShares } from '../../database/schema';
import { storageService } from '../storage/service';
import crypto from 'crypto';

export class ShareService {
    
    /**
     * Create a share link for a file
     */
    async createShare(params: {
        fileId: string,
        userId: string,
        type: 'public' | 'password',
        password?: string,
        expiresAt?: Date
    }) {
        // Generate unique token
        const token = crypto.randomBytes(16).toString('hex');
        
        const [share] = await db.insert(fileShares).values({
            fileId: params.fileId,
            createdBy: params.userId,
            token,
            isPasswordProtected: params.type === 'password',
            password: params.password || null, // In real app, hash this!
            expiresAt: params.expiresAt
        } as any).returning();
        
        return share;
    }

    /**
     * Get share info by token (public info only)
     */
    async getShareInfo(token: string) {
        const share = await db.query.fileShares.findFirst({
            where: eq(fileShares.token, token),
            with: {
                file: true,
                creator: {
                    columns: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });
        
        if (!share) return null;
        
        // Check expiration
        if (share.expiresAt && new Date() > share.expiresAt) {
            return null; 
        }

        return {
            id: share.id,
            token: share.token,
            isPasswordProtected: share.isPasswordProtected,
            fileName: share.file.name,
            fileSize: share.file.size,
            fileType: share.file.type,
            fileExtension: share.file.extension,
            createdAt: share.createdAt,
            expiresAt: share.expiresAt,
            creator: share.creator,
        };
    }

    /**
     * Verify password and get download URL
     */
    async getDownloadUrl(token: string, password?: string) {
        const share = await db.query.fileShares.findFirst({
            where: eq(fileShares.token, token),
            with: {
                file: true
            }
        });
        
        if (!share) throw new Error('Share not found');
        
        if (share.expiresAt && new Date() > share.expiresAt) {
            throw new Error('Share link expired');
        }

        if (share.isPasswordProtected) {
            if (!password || password !== share.password) { 
                 throw new Error('Invalid password');
            }
        }
        
        // Increment view count
        await db.update(fileShares)
            .set({ viewCount: (share.viewCount || 0) + 1 } as any)
            .where(eq(fileShares.id, share.id));

        // Generate download URL
        return await storageService.getDownloadUrl(share.file.path);
    }

    /**
     * List shares for a file
     */
    async getFileShares(fileId: string) {
        return await db.query.fileShares.findMany({
            where: eq(fileShares.fileId, fileId),
            orderBy: (shares, { desc }) => [desc(shares.createdAt)]
        });
    }

    /**
     * Delete a share
     */
    async deleteShare(id: string) {
        await db.delete(fileShares).where(eq(fileShares.id, id));
    }
}

export const shareService = new ShareService();
