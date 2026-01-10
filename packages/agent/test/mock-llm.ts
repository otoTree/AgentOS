import { LLMClient, LLMResponse } from '../src/core/types';

export class MockLLMClient implements LLMClient {
  async chat(messages: { role: string; content: string }[], tools?: any[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    // 检查 System Prompt 是否包含 JSON 指令
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const isJsonMode = systemPrompt.includes('output a JSON object');

    // 优先处理工具输出
    if (lastMessage.role === 'tool' || (lastMessage.role === 'user' && lastMessage.content.includes('Tool Output'))) {
        return {
            content: 'The weather in Beijing is sunny.',
        };
    }

    // 处理用户提问
    if (lastMessage.content.includes('weather') && lastMessage.role === 'user') {
      if (tools && tools.length > 0) {
          // Native Mode
          return {
            content: 'I need to check the weather.',
            toolCalls: [
              {
                name: 'get_weather',
                arguments: { location: 'Beijing' }
              }
            ]
          };
      } else if (isJsonMode) {
          // JSON Prompt Mode
          return {
              content: `I will check the weather.
\`\`\`json
{
  "tool": "get_weather",
  "arguments": {
    "location": "Beijing"
  }
}
\`\`\`
`
          };
      }
    } 

    return {
      content: 'I am a mock agent.',
    };
  }
}
