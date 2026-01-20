import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
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
