import { Tool } from '../core/types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor(initialTools: Tool[] = []) {
    initialTools.forEach(tool => this.register(tool));
  }

  register(tool: Tool) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsDescription(): string {
    return this.getAll().map(tool => {
      const schema = JSON.stringify(zodToJsonSchema(tool.parameters));
      return `Tool Name: ${tool.name}
Description: ${tool.description}
Parameters: ${schema}`;
    }).join('\n\n');
  }

  // 获取 OpenAI Function Calling 格式的 tools 定义
  getOpenAITools(): any[] {
    return this.getAll().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters)
      }
    }));
  }
}
