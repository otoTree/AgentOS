import { LLMClient, LLMResponse } from '@agentos/agent';
import { modelService } from '../ai/service';

export class ServiceLLMClient implements LLMClient {
  constructor(private modelId: string) {}

  async chat(messages: any[], tools?: any[]): Promise<LLMResponse> {
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
