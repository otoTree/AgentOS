import { join } from 'path';
import { existsSync, mkdirSync, statSync, rmSync } from 'fs';
import { readFile, writeFile, readdir, rm } from 'fs/promises';
import { SKILLS_ROOT_PATH } from '../paths';
import { SkillFile } from '../../types/rpc';

export class SkillFileSystemService {
    private skillsPath: string;

    constructor() {
        this.skillsPath = SKILLS_ROOT_PATH;
    }

    private getSkillPath(skillName: string): string {
        const path = join(this.skillsPath, skillName);
        if (!existsSync(path)) {
            throw new Error(`Skill '${skillName}' not found`);
        }
        return path;
    }

    private validatePath(skillName: string, relativePath: string): string {
        const skillRoot = this.getSkillPath(skillName);
        const fullPath = join(skillRoot, relativePath);
        
        // Security check: ensure path is within skill root
        if (!fullPath.startsWith(skillRoot)) {
            throw new Error('Access denied: Path is outside skill directory');
        }
        return fullPath;
    }

    async listFiles(skillName: string, dirPath: string = ''): Promise<SkillFile[]> {
        const fullPath = this.validatePath(skillName, dirPath);
        
        if (!existsSync(fullPath)) {
            return [];
        }

        const stats = statSync(fullPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path '${dirPath}' is not a directory`);
        }

        const dirents = await readdir(fullPath, { withFileTypes: true });
        const files: SkillFile[] = [];

        for (const dirent of dirents) {
            const relativeChildPath = join(dirPath, dirent.name);
            if (dirent.isDirectory()) {
                // Recursively list for now, or we can do lazy loading
                // For simplicity, let's just return the directory itself and maybe one level deep if needed
                // But for a tree view, we usually want hierarchy.
                // Let's return just this level, client can request children.
                files.push({
                    name: dirent.name,
                    path: relativeChildPath,
                    type: 'directory',
                    children: [] // Client will fetch children
                });
            } else {
                files.push({
                    name: dirent.name,
                    path: relativeChildPath,
                    type: 'file'
                });
            }
        }
        
        // Sort: directories first, then files
        return files.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    }

    async readFile(skillName: string, filePath: string): Promise<string> {
        const fullPath = this.validatePath(skillName, filePath);
        if (!existsSync(fullPath)) {
            throw new Error(`File '${filePath}' not found`);
        }
        return readFile(fullPath, 'utf-8');
    }

    async writeFile(skillName: string, filePath: string, content: string): Promise<void> {
        const fullPath = this.validatePath(skillName, filePath);
        // Ensure dir exists
        const dir = join(fullPath, '..');
        if (!existsSync(dir)) {
            await mkdirSync(dir, { recursive: true });
        }
        await writeFile(fullPath, content, 'utf-8');
    }

    async createDirectory(skillName: string, dirPath: string): Promise<void> {
        const fullPath = this.validatePath(skillName, dirPath);
        if (!existsSync(fullPath)) {
            await mkdirSync(fullPath, { recursive: true });
        }
    }

    async renameFile(skillName: string, oldPath: string, newPath: string): Promise<void> {
        const fullOldPath = this.validatePath(skillName, oldPath);
        const fullNewPath = this.validatePath(skillName, newPath);

        if (!existsSync(fullOldPath)) {
            throw new Error(`Path '${oldPath}' not found`);
        }

        if (existsSync(fullNewPath)) {
            throw new Error(`Path '${newPath}' already exists`);
        }

        // Ensure parent dir of new path exists
        const newDir = join(fullNewPath, '..');
        if (!existsSync(newDir)) {
            await mkdirSync(newDir, { recursive: true });
        }

        const rename = (await import('fs/promises')).rename;
        await rename(fullOldPath, fullNewPath);
    }

    async deleteFile(skillName: string, filePath: string): Promise<void> {
        const fullPath = this.validatePath(skillName, filePath);
        if (existsSync(fullPath)) {
            const stats = statSync(fullPath);
            if (stats.isDirectory()) {
                await rm(fullPath, { recursive: true, force: true });
            } else {
                await rm(fullPath);
            }
        }
    }
}
