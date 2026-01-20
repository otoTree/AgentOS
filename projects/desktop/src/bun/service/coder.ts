import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { writeFile, readFile, readdir, mkdir } from 'fs/promises';
import { SkillFileSystem, CoderAgent, LLMClient } from '@agentos/agent';
import { SKILLS_ROOT_PATH } from '../paths';

class LocalSkillFileSystem implements SkillFileSystem {
    public rootPath: string;
    private baseDir: string;

    constructor(baseDir: string, skillDirName: string) {
        this.baseDir = baseDir;
        this.rootPath = join(baseDir, skillDirName);
        if (!existsSync(this.rootPath)) {
            mkdirSync(this.rootPath, { recursive: true });
        }
    }

    async readFile(path: string): Promise<string> {
        return readFile(join(this.rootPath, path), 'utf-8');
    }

    async writeFile(path: string, content: string): Promise<void> {
        const fullPath = join(this.rootPath, path);
        // Ensure dir exists
        const dir = join(fullPath, '..');
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
        await writeFile(fullPath, content);
    }

    async listFiles(): Promise<string[]> {
        const getFiles = async (dir: string): Promise<string[]> => {
            const dirents = await readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map((dirent) => {
                const res = join(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            }));
            return Array.prototype.concat(...files);
        };
        
        const allFiles = await getFiles(this.rootPath);
        return allFiles.map(f => f.replace(this.rootPath + '/', ''));
    }

    async updateMeta(meta: any): Promise<void> {
        const metaPath = join(this.rootPath, '.agentos-meta.json');
        await writeFile(metaPath, JSON.stringify(meta, null, 2));
    }

    renameTo(newName: string) {
        const newPath = join(this.baseDir, newName);
        if (this.rootPath !== newPath) {
             if (existsSync(newPath)) {
                 console.warn(`Skill ${newName} already exists. Keeping temporary name.`);
                 return;
             }
             renameSync(this.rootPath, newPath);
             this.rootPath = newPath;
        }
    }
}

export class LocalCoderService {
    private skillsBaseDir: string;

    constructor(private llmClient: LLMClient) {
        this.skillsBaseDir = SKILLS_ROOT_PATH;
        if (!existsSync(this.skillsBaseDir)) {
            mkdirSync(this.skillsBaseDir, { recursive: true });
        }
    }

    async generateSkill(prompt: string): Promise<{ success: boolean; skillName?: string; error?: string }> {
        try {
            const tempId = `generated-${Date.now()}`;
            const fs = new LocalSkillFileSystem(this.skillsBaseDir, tempId);
            
            const agent = new CoderAgent(fs, this.llmClient);
            const structure = await agent.generateSkill({ request: prompt, dependencies: "" });
            
            if (structure.name) {
                // Rename directory to match skill name
                fs.renameTo(structure.name);
                return { success: true, skillName: structure.name };
            }
            
            return { success: true, skillName: tempId };
            
        } catch (e: any) {
            console.error("Generate Skill Error:", e);
            return { success: false, error: e.message };
        }
    }
}
