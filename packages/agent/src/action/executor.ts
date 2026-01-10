import { ToolRegistry } from '../tool/registry';
import { AgentAction } from '../core/types';

export class ActionExecutor {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  async execute(action: AgentAction): Promise<AgentAction> {
    if (action.type !== 'tool_call') {
      return action;
    }

    if (!action.toolName) {
      throw new Error('Tool name is required for tool_call action');
    }

    const tool = this.registry.get(action.toolName);
    if (!tool) {
      return {
        ...action,
        type: 'error',
        content: `Error: Tool "${action.toolName}" not found.`,
        timestamp: Date.now()
      };
    }

    try {
      console.log(`Executing tool: ${action.toolName} with args:`, action.toolArgs);
      // Validate args
      const validatedArgs = tool.parameters.parse(action.toolArgs);
      const result = await tool.execute(validatedArgs);
      
      return {
        ...action,
        type: 'tool_result',
        toolOutput: result,
        timestamp: Date.now()
      };
    } catch (error: any) {
      return {
        ...action,
        type: 'error',
        content: `Error executing tool "${action.toolName}": ${error.message}`,
        timestamp: Date.now()
      };
    }
  }
}
