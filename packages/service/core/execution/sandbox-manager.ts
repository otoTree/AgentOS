import { skillService } from '../skill/service';
import { storageService } from '../storage/service';
import { db } from '../../database';
import { taskArtifacts, files, tasks } from '../../database/schema';
import { eq } from 'drizzle-orm';

export class UnifiedSandboxManager {
    
    /**
     * Run a skill within the context of a task.
     * Handles input mounting and artifact capturing.
     */
    async runSkill(taskId: string, skillId: string, args: any) {
        // 1. Input Mounting
        const mounts: Array<{ path: string, content: Buffer | string }> = [];
        const processedArgs = await this.processInputs(args, mounts);

        // 2. Execute Skill
        const result = await skillService.runSkill(skillId, processedArgs, {
            mounts
        });

        // 3. Artifact Sniffer
        if (result && result._artifacts) {
            const capturedArtifacts = await this.processArtifacts(taskId, result._artifacts);
            delete result._artifacts; // Clean up result from the response
            
            // Inject captured artifacts info into result so it can be used by next steps
            result.artifacts = capturedArtifacts;
        }

        return result;
    }

    /**
     * Process inputs to find file references and prepare mounts.
     * Returns modified args with local paths.
     */
    private async processInputs(args: any, mounts: Array<{ path: string, content: Buffer | string }>): Promise<any> {
        if (typeof args === 'string') {
            // Check for file ID
            // Format: "file:UUID"
            const fileIdMatch = args.match(/^file:([0-9a-fA-F-]{36})$/);
            if (fileIdMatch) {
                const fileId = fileIdMatch[1];
                const fileRecord = await db.query.files.findFirst({
                    where: eq(files.id, fileId)
                });
                
                if (fileRecord) {
                    try {
                        const content = await storageService.getObjectRaw(fileRecord.path);
                        const mountPath = `/workspace/input/${fileRecord.name}`;
                        mounts.push({
                            path: mountPath,
                            content
                        });
                        return mountPath; // Replace arg with local path
                    } catch (e) {
                        console.warn(`Failed to mount file ${fileId}:`, e);
                        // Keep original arg if failed? Or throw?
                        // Keep original to let it fail in skill if it expects a path
                    }
                }
            }
            
            return args;
        } else if (Array.isArray(args)) {
            return Promise.all(args.map(item => this.processInputs(item, mounts)));
        } else if (typeof args === 'object' && args !== null) {
            const newArgs: any = {};
            for (const key in args) {
                newArgs[key] = await this.processInputs(args[key], mounts);
            }
            return newArgs;
        }
        return args;
    }
    
    private async processArtifacts(taskId: string, artifacts: any[]) {
        const captured = [];
        
        // Fetch task to get teamId
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId)
        });
        
        // If task not found (shouldn't happen), we can't link to team.
        // We'll proceed with taskArtifacts only? Or fail?
        // Let's assume task exists.
        
        for (const artifact of artifacts) {
            const { name, path, content_base64 } = artifact;
            const buffer = Buffer.from(content_base64, 'base64');
            const size = buffer.length;
            const mimeType = 'application/octet-stream'; // Todo: detect
            
            // 1. Upload & Create File Record (if we have teamId)
            let fileId: string | undefined;
            let fileUrl: string;
            
            if (task && task.teamId) {
                // Use storageService.uploadFile which creates DB record in `files`
                const fileRecord = await storageService.uploadFile(
                    task.teamId, 
                    'system', // Uploaded by system/agent
                    {
                        name,
                        size,
                        type: mimeType,
                        buffer
                    }
                );
                fileId = fileRecord.id;
                fileUrl = fileRecord.url || '';
            } else {
                // Fallback: direct upload without `files` record (just for task artifact)
                 const key = `tasks/${taskId}/artifacts/${name}`;
                 fileUrl = await storageService.uploadRaw(key, buffer, mimeType);
            }
            
            // 2. Save to task_artifacts
            const [artifactRecord] = await db.insert(taskArtifacts).values({
                taskId,
                type: 'file',
                name: name,
                url: fileUrl,
                size: size,
                mimeType: mimeType
            }).returning();
            
            console.log(`[ArtifactSniffer] Captured artifact: ${name} (${fileUrl})`);
            
            captured.push({
                ...artifactRecord,
                fileId: fileId // Important: this allows next steps to use "file:UUID"
            });
        }
        
        return captured;
    }
}

export const sandboxManager = new UnifiedSandboxManager();
