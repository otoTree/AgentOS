import { LLMClient, LLMResponse } from '@agentos/superagent';
import { modelService } from '@agentos/service/core/ai/service';

export class ServiceLLMClient implements LLMClient {
  constructor(private modelId: string) {}

  async chat(messages: any[], tools?: any[]): Promise<LLMResponse> {
    // Convert generic messages to what modelService expects if necessary
    // modelService expects { role: string, content: string, tool_calls?: ... }
    // SuperAgent messages might have tool_calls in a specific format.
    // Let's assume they are compatible or cast them.
    
    const res = await modelService.chatComplete(this.modelId, messages, {
      tools,
      temperature: 0, 
    });

    return {
      content: res.content || '',
      toolCalls: res.toolCalls,
    };
  }
}
