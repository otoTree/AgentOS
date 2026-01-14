import fs from 'fs/promises';
import path from 'path';
import { Skill } from './types';
import { SkillParser } from './parser';

export class SkillManager {
  private skills: Map<string, Skill> = new Map();

  /**
   * Load all .md files from a directory and register them as skills
   */
  async loadFromDirectory(dir: string): Promise<void> {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (file.endsWith('.md')) {
                const content = await fs.readFile(path.join(dir, file), 'utf-8');
                this.registerSkill(content);
            }
        }
    } catch (error) {
        console.error(`Failed to load skills from ${dir}:`, error);
        throw error;
    }
  }
  
  /**
   * Register a single skill from its content
   */
  registerSkill(content: string): void {
    const skill = SkillParser.parse(content);
    // Use metadata name as key. Fallback to a generated ID if name is missing is not handled here,
    // assuming valid SKILL.md has name.
    if (skill.metadata.name) {
        this.skills.set(skill.metadata.name, skill);
    } else {
        console.warn('Skipping skill registration due to missing name in metadata');
    }
  }

  /**
   * Generate the prompt string for all loaded skills.
   * Includes core content, loaded chunks, and list of available chunks.
   */
  getSkillsPrompt(): string {
    let prompt = '';
    
    for (const [name, skill] of this.skills) {
        prompt += `## Skill: ${skill.metadata.name}\n`;
        if (skill.metadata.description) {
            prompt += `Description: ${skill.metadata.description}\n\n`;
        }
        prompt += `${skill.coreContent}\n\n`;
        
        // Add Active Chunks Content (Progressive Loading)
        // If a chunk is active, we display it inline.
        if (skill.activeChunks.size > 0) {
            prompt += `### Loaded Details\n`;
            for (const chunkId of skill.activeChunks) {
                const chunk = skill.chunks.get(chunkId);
                if (chunk) {
                    prompt += `#### ${chunk.description} (${chunk.id})\n${chunk.content}\n\n`;
                }
            }
        }

        // List Available (Inactive) Chunks
        const availableChunks: string[] = [];
        for (const [id, chunk] of skill.chunks) {
            if (!skill.activeChunks.has(id)) {
                availableChunks.push(`- id: ${id} | description: ${chunk.description}`);
            }
        }

        if (availableChunks.length > 0) {
            prompt += `[Available Details for ${name}]\n`;
            prompt += `(Load these using load_skill_chunk tool if you need more info)\n`;
            prompt += availableChunks.join('\n') + '\n\n';
        }
        
        prompt += '---\n\n';
    }
    
    return prompt;
  }

  /**
   * Activate a specific chunk for a skill.
   * Returns the content of the chunk.
   */
  activateChunk(skillName: string, chunkId: string): string {
    const skill = this.skills.get(skillName);
    if (!skill) {
        throw new Error(`Skill '${skillName}' not found.`);
    }

    const chunk = skill.chunks.get(chunkId);
    if (!chunk) {
        throw new Error(`Chunk '${chunkId}' not found in skill '${skillName}'.`);
    }

    skill.activeChunks.add(chunkId);
    return chunk.content;
  }
  
  getSkill(name: string): Skill | undefined {
      return this.skills.get(name);
  }
}
