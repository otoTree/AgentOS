import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { readdir, readFile, rm } from 'fs/promises';
import { Skill, SkillParser } from '@agentos/agent';
import { SKILLS_ROOT_PATH } from '../paths';

export class SkillRegistry {
  private skillsPath: string;

  constructor() {
    this.skillsPath = SKILLS_ROOT_PATH;
    this.ensureSkillsDir();
  }

  private ensureSkillsDir() {
    if (!existsSync(this.skillsPath)) {
      mkdirSync(this.skillsPath, { recursive: true });
    }
  }

  async listSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];
    try {
      if (!existsSync(this.skillsPath)) {
          return [];
      }
      
      const dirs = await readdir(this.skillsPath, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const skillPath = join(this.skillsPath, dir.name);
          const skillMdPath = join(skillPath, 'SKILL.md');
          
          if (existsSync(skillMdPath)) {
            try {
              const content = await readFile(skillMdPath, 'utf-8');
              const skill = SkillParser.parse(content);
              
              // Store original name as displayName
              const originalName = skill.metadata.name;

              // Force metadata.name to match directory name to ensure ID consistency
              // This allows the frontend to use metadata.name as the ID for file operations
              skill.metadata.name = dir.name;
              skill.metadata.displayName = originalName;

              // Set Execution Config
              skill.executionConfig = {
                rootPath: skillPath
              };

              // Set Cloud Config (Mock logic for now, or read from a local meta file if exists)
              // For now, we assume local-only unless we find a .meta.json or similar
              skill.cloudConfig = {
                isPublic: false,
                syncStatus: 'local-only'
              };

              skills.push(skill);
            } catch (e) {
              console.error(`Failed to parse skill at ${skillPath}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to list skills:', e);
    }
    return skills;
  }

  async deleteSkill(skillName: string): Promise<boolean> {
    // Security check: ensure skillName doesn't contain traversal characters
    if (skillName.includes('..') || skillName.includes('/') || skillName.includes('\\')) {
        throw new Error('Invalid skill name');
    }

    const skillPath = join(this.skillsPath, skillName);
    
    if (existsSync(skillPath)) {
        await rm(skillPath, { recursive: true, force: true });
        return true;
    } else {
        throw new Error(`Skill directory '${skillName}' not found`);
    }
  }

  async publishSkill(skillName: string): Promise<{ success: boolean; skillId?: string }> {
     // Mock Publish Logic
     // In reality: POST /api/v1/skills/publish
     console.log(`Publishing skill: ${skillName}`);
     
     // Find the skill to ensure it exists
     const skills = await this.listSkills();
     const skill = skills.find(s => s.metadata.name === skillName);
     if (!skill) {
         throw new Error(`Skill ${skillName} not found`);
     }

     // Simulate API call
     await new Promise(resolve => setTimeout(resolve, 1000));

     return { success: true, skillId: `skill_${Date.now()}` };
  }
}
