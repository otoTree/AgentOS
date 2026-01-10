import { Tool } from '@agentos/agent';
import { MetaJson, skillService } from '../skill/service';
import { builtInTools } from '../tool';
import { z } from 'zod';

export class ContextManager {
  private systemTools: Tool[] = [];
  private skillTools: Tool[] = [];

  constructor() {}

  /**
   * Load built-in tools from the system
   */
  async loadBuiltInTools(toolNames?: string[]) {
    // If toolNames is provided, only load those tools
    const tools = toolNames 
      ? builtInTools.filter(t => toolNames.includes(t.name))
      : builtInTools;
    
    // Avoid duplicates
    for (const tool of tools) {
      if (!this.systemTools.find(t => t.name === tool.name)) {
        this.systemTools.push(tool);
      }
    }
    
    return tools;
  }

  /**
   * Load skills into the context as tools
   */
  async loadSkills(skills: (MetaJson & { code?: string })[]) {
    const newSkillTools: Tool[] = skills.map(skill => {
      // Ensure we have a valid JSON schema for the tool
      const jsonSchema = skill.input_schema || {
        type: 'object',
        properties: {},
        description: 'No parameters required'
      };

      return {
        name: skill.name,
        description: skill.description || `Skill ${skill.name}`,
        parameters: z.any(), // We use jsonSchema for the prompt
        jsonSchema: jsonSchema,
        execute: async (args: any) => {
          console.log(`Executing skill ${skill.name} (${skill.id}) with args:`, args);
          
          try {
              const result = await skillService.runSkill(skill.id, args);
              return result;
          } catch (e) {
              console.error(`Skill ${skill.name} execution error:`, e);
              throw e;
          }
        }
      };
    });

    // Avoid duplicates by skill name
    for (const tool of newSkillTools) {
      const index = this.skillTools.findIndex(t => t.name === tool.name);
      if (index !== -1) {
        this.skillTools[index] = tool; // Update existing
      } else {
        this.skillTools.push(tool);
      }
    }

    return newSkillTools;
  }

  /**
   * Get all tools (system tools + skill tools)
   */
  getTools(): Tool[] {
    return [...this.systemTools, ...this.skillTools];
  }

  /**
   * Clear all loaded tools
   */
  clear() {
    this.systemTools = [];
    this.skillTools = [];
  }
}
