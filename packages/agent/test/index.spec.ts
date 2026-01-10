import { describe, it, expect } from 'vitest';
import { SuperAgent } from '../src/core/agent';
import { Tool } from '../src/core/types';
import { MockLLMClient } from './mock-llm';
import { z } from 'zod';

describe('SuperAgent', () => {
  // Define a tool
  const weatherTool: Tool = {
    name: 'get_weather',
    description: 'Get weather for a location',
    parameters: z.object({
      location: z.string()
    }),
    execute: async (args) => {
      return { temperature: 25, condition: 'Sunny', location: args.location };
    }
  };

  it('should run a simple conversation with native tool execution', async () => {
    // Initialize Agent
    const agent = new SuperAgent({
      model: 'mock-model',
      prompts: {
        system: 'You are a helpful assistant.',
        user: '{{input}}'
      },
      tools: [weatherTool],
      llmClient: new MockLLMClient(),
      toolCallMethod: 'native'
    });

    // Run Agent
    const response = await agent.run('What is the weather in Beijing?');
    
    expect(response).toBe('The weather in Beijing is sunny.');
  });

  it('should run a conversation with JSON Prompt tool execution', async () => {
    // Initialize Agent
    const agent = new SuperAgent({
      model: 'mock-model',
      prompts: {
        system: 'You are a helpful assistant.',
        user: '{{input}}'
      },
      tools: [weatherTool],
      llmClient: new MockLLMClient(),
      toolCallMethod: 'json_prompt'
    });

    // Run Agent
    const response = await agent.run('What is the weather in Beijing?');
    
    expect(response).toBe('The weather in Beijing is sunny.');
  });
});
