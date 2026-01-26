import { LLMClient, LLMResponse } from '@agentos/agent';
import { modelService } from './service';

export class ServiceLLMClient implements LLMClient {
  private modelId: string;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  async chat(messages: { role: string; content: string | null; tool_calls?: Record<string, unknown>[]; tool_call_id?: string }[], tools?: Record<string, unknown>[]): Promise<LLMResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await modelService.chatComplete(this.modelId, messages as any, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
    });

    return {
      content: result.content || '',
      toolCalls: result.toolCalls,
    };
  }
}
