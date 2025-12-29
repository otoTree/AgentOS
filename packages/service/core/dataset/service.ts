import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database';
import { folders, files, datasetPermissions } from '../../database/schema';
import { storageService } from '../storage/service';

export class DatasetService {
    
    // --- Folders ---

    async createFolder(params: { name: string, parentId?: string | null, teamId?: string | null, ownerId: string }) {
        const [folder] = await db.insert(folders).values({
            name: params.name,
            parentId: params.parentId || null,
            teamId: params.teamId || null,
            ownerId: params.ownerId
        } as any).returning();
        return folder;
    }

    async deleteFolder(folderId: string, userId: string) {
        const folder = await this.getFolder(folderId);
        if (!folder) throw new Error("Folder not found");
        
        // Permission Check: Owner only for now
        if (folder.ownerId !== userId) {
             throw new Error("Permission denied");
        }

        // Recursively delete subfolders and files
        // 1. Get all subfolders
        // This is tricky without recursive CTEs or multiple queries.
        // For MVP, we only allow deleting if empty? Or just flat delete direct children?
        // Let's implement direct children delete for now.
        
        // Delete files in this folder
        const folderFiles = await db.query.files.findMany({
            where: eq(files.folderId, folderId)
        });
        
        for (const file of folderFiles) {
            await storageService.deleteFile(file.id);
        }

        // Delete subfolders (only one level deep for now, or fail if has children)
        // Let's just delete the folder itself, but if it has children, FK constraint might fail or leave orphans if no cascade.
        // The schema doesn't have ON DELETE CASCADE.
        // So we should fail if has subfolders.
        const subfolders = await db.query.folders.findFirst({
            where: eq(folders.parentId, folderId)
        });
        
        if (subfolders) {
            throw new Error("Folder is not empty (contains subfolders)");
        }

        await db.delete(folders).where(eq(folders.id, folderId));
        return true;
    }

    async getFolder(id: string) {
        return await db.query.folders.findFirst({
            where: eq(folders.id, id),
            with: {
                owner: true
            }
        });
    }

    // --- Listing ---

    async list(params: { parentId?: string | null, teamId?: string | null, userId: string, source: 'personal' | 'team' }) {
        // 1. Folders
        const folderConditions = [];
        if (params.parentId) {
            folderConditions.push(eq(folders.parentId, params.parentId));
        } else {
            folderConditions.push(isNull(folders.parentId));
        }

        if (params.source === 'personal') {
            folderConditions.push(eq(folders.ownerId, params.userId));
            folderConditions.push(isNull(folders.teamId));
        } else if (params.source === 'team' && params.teamId) {
             folderConditions.push(eq(folders.teamId, params.teamId));
        }

        const foldersList = await db.query.folders.findMany({
            where: and(...folderConditions),
            with: {
                owner: true
            }
        });

        // 2. Files
        let filesList: any[] = [];
        
        if (params.source === 'team' && params.teamId) {
             // Query direct team files in this folder
             const directFiles = await db.query.files.findMany({
                 where: and(
                     eq(files.teamId, params.teamId),
                     params.parentId ? eq(files.folderId, params.parentId) : isNull(files.folderId)
                 ),
                 with: { uploader: true }
             });

             // Query shared files (Only show at root level of Team Space)
             let sharedFiles: any[] = [];
             if (!params.parentId) {
                 const permissions = await db.query.datasetPermissions.findMany({
                     where: eq(datasetPermissions.teamId, params.teamId),
                     with: { file: { with: { uploader: true } } }
                 });
                 // Extract valid files
                 sharedFiles = permissions
                    .map(p => p.file)
                    .filter(f => f)
                    .map(f => ({ ...f, isShared: true }));
             }

             filesList = [...directFiles, ...sharedFiles];
        } else {
             // Personal Files
             filesList = await db.query.files.findMany({
                 where: and(
                     eq(files.uploadedBy, params.userId),
                     isNull(files.teamId),
                     params.parentId ? eq(files.folderId, params.parentId) : isNull(files.folderId)
                 ),
                 with: { uploader: true }
             });
        }
        
        // Generate URLs
        const filesWithUrls = await Promise.all(filesList.map(async (f) => {
             const url = await storageService.getDownloadUrl(f.path);
             return { ...f, url };
        }));

        return {
            folders: foldersList,
            files: filesWithUrls
        };
    }

    // --- Permissions ---
    
    async shareFile(fileId: string, targetTeamId: string, permission: 'read' | 'write' = 'read') {
        const existing = await db.query.datasetPermissions.findFirst({
            where: and(
                eq(datasetPermissions.fileId, fileId),
                eq(datasetPermissions.teamId, targetTeamId)
            )
        });
        
        if (existing) {
            return await db.update(datasetPermissions)
                .set({ permission } as any)
                .where(eq(datasetPermissions.id, existing.id))
                .returning();
        }
        
        return await db.insert(datasetPermissions).values({
            fileId,
            teamId: targetTeamId,
            permission
        } as any).returning();
    }
    
    async unshareFile(fileId: string, targetTeamId: string) {
        await db.delete(datasetPermissions).where(and(
             eq(datasetPermissions.fileId, fileId),
             eq(datasetPermissions.teamId, targetTeamId)
        ));
    }

    async getFilePermissions(fileId: string) {
        return await db.query.datasetPermissions.findMany({
            where: eq(datasetPermissions.fileId, fileId),
            with: { team: true, user: true }
        });
    }

    async checkPermission(fileId: string, userId: string, teamId?: string): Promise<'none' | 'read' | 'write' | 'owner'> {
        const file = await db.query.files.findFirst({ where: eq(files.id, fileId) });
        if (!file) return 'none';
        
        if (file.uploadedBy === userId) return 'owner';
        
        // Check direct permission (if shared to user, not impl yet but structure supports)
        
        // Check team permission
        if (teamId) {
            // Is it a team file?
            if (file.teamId === teamId) {
                // It is a team file.
                // Default: Read. Write? "不支持成员在团队空间修改其他成员的文件，除非有权限"
                // Check if user has explicit write permission via roles? 
                // Currently system roles are simplistic.
                // Let's assume Read for all team members, Write requires check?
                // But wait, if it's a team file, we might check datasetPermissions too?
                // "除非有权限" -> datasetPermissions can be used for internal team file permissions too?
                // Let's support it: if there is a permission record for this user/team on this file.
            }
            
            // Check Shared permission
            const perm = await db.query.datasetPermissions.findFirst({
                where: and(
                    eq(datasetPermissions.fileId, fileId),
                    eq(datasetPermissions.teamId, teamId)
                )
            });
            
            if (perm) return perm.permission as 'read' | 'write';
        }
        
        return 'none'; // Or 'read' if it's a team file and we assume default read? 
        // For now safe default is none/read based on context.
        // If it's a team file and user is member, they usually have read access.
        if (file?.teamId && teamId === file?.teamId) return 'read';
        
        return 'none';
    }
}

export const datasetService = new DatasetService();
