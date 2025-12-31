import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../database';
import { skills } from '../../database/schema';
import { storageService } from '../storage/service';

export interface MetaJson {
  id: string;
  name: string;
  version: string;
  entrypoint: string;
  description?: string;
  files: string[];
  input_schema?: any;
  output_schema?: any;
  test_cases?: any[];
}

export class SkillService {
    
    private getOssPath(skillId: string, version = 'v1') {
        return `skills/${skillId}/${version}/`;
    }

    /**
     * Create a new Skill
     */
    async createSkill(params: { 
        teamId: string, 
        ownerId: string, 
        name: string, 
        description?: string, 
        emoji?: string,
        isPublic?: boolean 
    }) {
        const id = crypto.randomUUID();
        const ossPath = this.getOssPath(id);

        // 1. Create DB Record
        const [skill] = await db.insert(skills).values({
            id,
            teamId: params.teamId,
            ownerId: params.ownerId,
            name: params.name,
            description: params.description,
            emoji: params.emoji,
            ossPath,
            isPublic: params.isPublic || false,
        } as any).returning();

        // 2. Init OSS with minimal meta.json
        const meta: MetaJson = {
            id,
            name: params.name,
            version: '1.0.0',
            entrypoint: 'src/main.py',
            description: params.description,
            files: ['src/main.py'],
        };
        
        await this.saveMeta(ossPath, meta);
        
        // 3. Create default main.py
        await storageService.uploadRaw(
            `${ossPath}src/main.py`, 
            Buffer.from('def main(args):\n    print("Hello from Skill")\n    return {"status": "ok"}'), 
            'text/x-python'
        );

        return skill;
    }

    /**
     * Get Skill Details (DB + Meta)
     */
    async getSkill(id: string) {
        const skill = await db.query.skills.findFirst({
            where: eq(skills.id, id),
            with: {
                owner: true
            }
        });

        if (!skill) throw new Error('Skill not found');

        // Fetch meta.json
        const meta = await this.getMeta(skill.ossPath);

        return {
            ...skill,
            meta
        };
    }

    /**
     * List Skills
     */
    async listSkills(teamId: string) {
        return await db.query.skills.findMany({
            where: eq(skills.teamId, teamId),
            orderBy: [desc(skills.updatedAt)]
        });
    }

    /**
     * List All Skills (Admin)
     */
    async listAllSkills() {
        return await db.query.skills.findMany({
            with: {
                owner: true,
                team: true
            },
            orderBy: [desc(skills.updatedAt)]
        });
    }

    /**
     * Update Skill Files (Code + Meta)
     */
    async updateSkillFiles(id: string, files: Record<string, string>, metaUpdates?: Partial<MetaJson>) {
        const skill = await db.query.skills.findFirst({ where: eq(skills.id, id) });
        if (!skill) throw new Error('Skill not found');

        const ossPath = skill.ossPath;

        // 1. Upload Files
        for (const [filename, content] of Object.entries(files)) {
            // filename should be relative like "src/main.py"
            await storageService.uploadRaw(
                `${ossPath}${filename}`,
                Buffer.from(content),
                'text/plain' // or detect mime
            );
        }

        // 2. Update Meta
        let meta = await this.getMeta(ossPath);
        if (metaUpdates) {
            meta = { ...meta, ...metaUpdates };
        }

        // Ensure all updated files are in meta.files
        const newFiles = Object.keys(files);
        let filesChanged = false;
        newFiles.forEach(file => {
            if (!meta.files.includes(file)) {
                meta.files.push(file);
                filesChanged = true;
            }
        });
        
        await this.saveMeta(ossPath, meta);

        // 3. Update DB Cache (and other fields if needed)
        // Sync name/description if changed in meta
        const dbUpdates: any = {
            inputSchema: meta.input_schema,
            outputSchema: meta.output_schema,
            updatedAt: new Date(),
        };
        
        if (meta.name) dbUpdates.name = meta.name;
        if (meta.description) dbUpdates.description = meta.description;

        await db.update(skills).set(dbUpdates).where(eq(skills.id, id));

        return meta;
    }

    /**
     * Update Skill Metadata (DB + Meta, no files)
     */
    async updateSkillMeta(id: string, updates: { name?: string, description?: string, emoji?: string, isPublic?: boolean }) {
         const skill = await db.query.skills.findFirst({ where: eq(skills.id, id) });
         if (!skill) throw new Error('Skill not found');
         
         const ossPath = skill.ossPath;
         
         // 1. Update DB
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         await db.update(skills).set({
             ...updates,
             updatedAt: new Date(),
         } as any).where(eq(skills.id, id));
         
         // 2. Update Meta.json (sync name/desc)
         if (updates.name || updates.description) {
             const meta = await this.getMeta(ossPath);
             if (updates.name) meta.name = updates.name;
             if (updates.description) meta.description = updates.description;
             await this.saveMeta(ossPath, meta);
         }
         
         return await this.getSkill(id);
    }

    /**
     * Get Skill File Content
     */
    async getSkillFile(id: string, filename: string) {
        const skill = await db.query.skills.findFirst({ where: eq(skills.id, id) });
        if (!skill) throw new Error('Skill not found');

        const ossPath = skill.ossPath;
        const buffer = await storageService.getObjectRaw(`${ossPath}${filename}`);
        return buffer.toString('utf-8');
    }

    /**
     * Delete Skill File
     */
    async deleteSkillFile(id: string, filename: string) {
        const skill = await db.query.skills.findFirst({ where: eq(skills.id, id) });
        if (!skill) throw new Error('Skill not found');

        const ossPath = skill.ossPath;
        const meta = await this.getMeta(ossPath);

        // Check if file exists in meta
        if (!meta.files.includes(filename)) {
            // Might exist in OSS but not meta, or not exist at all.
            // We'll try to delete from OSS anyway if it's not in meta? 
            // Or strict mode? Strict is better.
            throw new Error('File not found in skill metadata');
        }

        // 1. Delete from OSS
        try {
            await storageService.deleteObject(`${ossPath}${filename}`);
        } catch (e) {
            console.warn(`Failed to delete ${filename} from OSS`, e);
            // Continue to remove from meta
        }

        // 2. Update Meta
        meta.files = meta.files.filter(f => f !== filename);
        await this.saveMeta(ossPath, meta);

        return meta;
    }

    /**
     * Run Skill
     */
    async runSkill(id: string, input: any) {
        const skill = await db.query.skills.findFirst({ where: eq(skills.id, id) });
        if (!skill) throw new Error('Skill not found');

        const ossPath = skill.ossPath;
        const meta = await this.getMeta(ossPath);

        // 1. Prepare Code for Sandbox
        // We need to fetch all files and combine them.
        
        let bootstrapCode = 'import os\n';
        
        // Fetch all files
        for (const file of meta.files) {
            if (file === meta.entrypoint) continue;
            
            // Fetch content
            const buffer = await storageService.getObjectRaw(`${ossPath}${file}`);
            const content = buffer.toString('utf-8');
            const b64 = Buffer.from(content).toString('base64');
            
            bootstrapCode += `
os.makedirs(os.path.dirname("${file}"), exist_ok=True)
with open("${file}", "wb") as f:
    import base64
    f.write(base64.b64decode("${b64}"))
`;
        }

        // Fetch Entrypoint
        const entryBuffer = await storageService.getObjectRaw(`${ossPath}${meta.entrypoint}`);
        const entryContent = entryBuffer.toString('utf-8');

        // Append Entrypoint logic
        const inputBase64 = Buffer.from(JSON.stringify(input)).toString('base64');

        bootstrapCode += `
# --- Entrypoint: ${meta.entrypoint} ---
${entryContent}

# --- Runner ---
import json
import sys
import base64
import asyncio
import inspect

if __name__ == "__main__":
    try:
        # Load args from base64 injected string
        input_b64 = "${inputBase64}"
        args = json.loads(base64.b64decode(input_b64).decode('utf-8'))
        
        if 'main' in locals():
            # Check if main is async
            if inspect.iscoroutinefunction(main):
                result = asyncio.run(main(**args))
            else:
                result = main(**args)
                
            print(json.dumps(result))
        else:
            print("No main function found")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
`;

        // 2. Call Sandbox
        const sandboxUrl = process.env.SANDBOX_URL || 'http://localhost:8080';
        const token = process.env.SANDBOX_TOKEN || 'dev';
        
        try {
            const response = await fetch(`${sandboxUrl}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: bootstrapCode,
                    timeoutMs: 30000 // 30s
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Sandbox Execution Failed: ${err}`);
            }

            const result = await response.json();
            return result;
        } catch (error: any) {
            console.warn(`[SkillService] Sandbox execution failed: ${error.message}`);
            // If connection refused, we return a friendly error structure instead of crashing
            if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
                 return {
                     success: false,
                     error: 'Sandbox Unavailable',
                     details: 'Could not connect to the sandbox service. Please ensure it is running.',
                     rawError: error.message
                 };
            }
            throw error;
        }
    }

    // --- Helpers ---

    private async getMeta(ossPath: string): Promise<MetaJson> {
        try {
            const buffer = await storageService.getObjectRaw(`${ossPath}meta.json`);
            return JSON.parse(buffer.toString());
        } catch (e) {
            throw new Error(`Failed to load meta.json from ${ossPath}`);
        }
    }

    private async saveMeta(ossPath: string, meta: MetaJson) {
        await storageService.uploadRaw(
            `${ossPath}meta.json`, 
            Buffer.from(JSON.stringify(meta, null, 2)), 
            'application/json'
        );
    }
    /**
     * Delete Skill
     */
    async deleteSkill(id: string) {
        // Optional: Clean up OSS
        // const skill = await this.getSkill(id);
        // ... list and delete objects ...
        
        await db.delete(skills).where(eq(skills.id, id));
    }
}

export const skillService = new SkillService();
