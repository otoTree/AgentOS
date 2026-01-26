
import { AIProvider, ProviderConfig } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { SiliconFlowProvider } from './siliconflow';

export class ProviderFactory {
    static create(type: string, config: ProviderConfig): AIProvider {
        switch (type) {
            case 'openai':
            case 'local': // Local usually follows OpenAI format
                return new OpenAIProvider(config);
            case 'anthropic':
                return new AnthropicProvider(config);
            case 'siliconflow':
                return new SiliconFlowProvider(config);
            default:
                throw new Error(`Unsupported provider type: ${type}`);
        }
    }
}

export * from './base';
export * from './openai';
export * from './anthropic';
export * from './siliconflow';
