import { SuperAgent, AgentConfig, LLMClient, AgentCallbacks } from '@agentos/superagent';
import { ReadFileTool, WriteFileTool, ListFilesTool } from './tools/fs';
import { CODER_SYSTEM_PROMPT } from './prompts';
import { SkillFileSystem } from './interfaces';

export class CoderAgent {
  private agent: SuperAgent;

  constructor(
    private fs: SkillFileSystem,
    private llmClient: LLMClient,
    options?: {
        systemPrompt?: string;
        history?: any[];
    }
  ) {
    const tools = [
      new ReadFileTool(fs),
      new WriteFileTool(fs),
      new ListFilesTool(fs),
    ];

    const config: AgentConfig = {
      model: 'coder-agent', // Placeholder
      llmClient: this.llmClient,
      tools: tools,
      prompts: {
        system: options?.systemPrompt || CODER_SYSTEM_PROMPT,
      },
      history: options?.history || [],
      toolCallMethod: 'native', // Or 'json_prompt' depending on LLM
    };

    this.agent = new SuperAgent(config);
  }

  async run(instruction: string, callbacks?: AgentCallbacks) {
    if (callbacks) {
        this.agent.setCallbacks(callbacks);
    }
    const result = await this.agent.run(instruction);
    
    // Find the last file written
    const history = this.agent.getContext().history;
    const writeActions = history.filter(a => a.type === 'tool_call' && a.toolName === 'write_file');
    
    let filename = '';
    let code = '';
    
    if (writeActions.length > 0) {
      const lastAction = writeActions[writeActions.length - 1];
      filename = lastAction.toolArgs.path;
      code = lastAction.toolArgs.content;
    }
    
    return {
      filename,
      code,
      explanation: result
    };
  }
}
