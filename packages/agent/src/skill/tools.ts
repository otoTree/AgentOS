import { z } from 'zod';
import { Tool } from '../core/types';
import { SkillManager } from './manager';

export class LoadSkillChunkTool implements Tool {
  name = "load_skill_chunk";
  description = "Load specific documentation chunk for a skill when you need more details (e.g., examples, edge cases).";
  
  parameters = z.object({
    skill_name: z.string().describe("The name of the skill"),
    chunk_id: z.string().describe("The ID of the chunk to load")
  });

  constructor(private manager: SkillManager) {}
  
  async execute(args: { skill_name: string; chunk_id: string }) {
    try {
        const content = this.manager.activateChunk(args.skill_name, args.chunk_id);
        return {
            status: "success",
            content: content,
            message: `Successfully loaded chunk '${args.chunk_id}' for skill '${args.skill_name}'.`
        };
    } catch (error: any) {
        return {
            status: "error",
            error: error.message
        };
    }
  }
}
