import { describe, it, expect, vi } from 'vitest';
import { SuperAgent } from './agent';
import { LLMClient, LLMResponse } from './types';

class MockLLMClient implements LLMClient {
  async chat(messages: any[], tools?: any[]): Promise<LLMResponse> {
    return {
      content: 'Hello world',
    };
  }
}

describe('SuperAgent', () => {
  it('should include history in messages', async () => {
    const mockLLM = new MockLLMClient();
    const chatSpy = vi.spyOn(mockLLM, 'chat');

    const history = [
      { role: 'user', content: 'Previous user message' },
      { role: 'assistant', content: 'Previous assistant message' }
    ];

    const agent = new SuperAgent({
      model: 'test-model',
      prompts: {
        system: 'System prompt',
        user: '{{input}}'
      },
      llmClient: mockLLM,
      history: history
    });

    await agent.run('Current input');

    expect(chatSpy).toHaveBeenCalled();
    const calls = chatSpy.mock.calls[0];
    const messages = calls[0];

    // Check message structure
    // 0: System
    // 1: History User
    // 2: History Assistant
    // 3: Current User
    
    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('Previous user message');
    expect(messages[2].role).toBe('assistant');
    expect(messages[2].content).toBe('Previous assistant message');
    expect(messages[3].role).toBe('user');
    expect(messages[3].content).toBe('Current input');
  });
});
