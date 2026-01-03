import { LLMClient, LLMResponse } from '../core/types';
import { modelService } from '@agentos/service/core/ai/service';

export class AgentOSLLMClient implements LLMClient {
  private modelId: string;
  private temperature?: number;
  private maxTokens?: number;

  constructor(config: { modelId: string; temperature?: number; maxTokens?: number }) {
    this.modelId = config.modelId;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
  }

  async chat(messages: { role: string; content: string }[], tools?: any[]): Promise<LLMResponse> {
    const response = await modelService.chatComplete(
      this.modelId,
      messages,
      {
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        tools: tools
      }
    );

    return {
      content: response.content || '',
      toolCalls: response.toolCalls
    };
  }
}
