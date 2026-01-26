
import { AIProvider } from './base';
import { fetchWithRetry } from '../utils/fetch';
import { 
    ChatOptions, 
    ChatResponse, 
    EmbeddingsOptions
} from '../types';

export class AnthropicProvider extends AIProvider {
    
    private getBaseUrl(path: string): string {
        const base = (this.config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');
        return `${base}${path}`;
    }

    private getHeaders(): Record<string, string> {
        return {
            'x-api-key': this.config.apiKey!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async chatComplete(modelName: string, messages: any[], options: ChatOptions = {}): Promise<ChatResponse> {
        const url = this.getBaseUrl('/messages');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const systemMsg = messages.find((m: any) => m.role === 'system');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userMessages = messages.filter((m: any) => m.role !== 'system');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            model: modelName,
            system: systemMsg?.content,
            messages: userMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            stream: false
        };
        
        // Note: Anthropic tools format is different from OpenAI
        // We would need a converter here. For now, just ignore tools for Anthropic in this basic implementation
        
        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Anthropic API Error: ${res.status} ${error}`);
        }

        const data = await res.json();
        return {
            content: data.content[0].text
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEmbeddings(modelName: string, input: string | string[], options?: EmbeddingsOptions): Promise<number[][]> {
        throw new Error('Anthropic does not support embeddings natively.');
    }

    async testConnection(): Promise<{ success: boolean; message: string; models?: unknown[] }> {
        try {
            // Anthropic doesn't have a simple "list models" endpoint that is always accessible or documented as standard open endpoint
            // But we can try a dummy request or just assume success if key is valid (hard to validate without making a paid call)
            // However, recent API updates might allow listing models. 
            // Let's stick to the previous logic: try models endpoint if exists, else return success.
            // Actually, `GET /v1/models` is now supported.
            
            const url = this.getBaseUrl('/models');
            const res = await fetchWithRetry(url, {
                headers: {
                    'x-api-key': this.config.apiKey!,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 10000
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(`Connection Failed: ${res.status} ${error}`);
            }
                 
            return { success: true, message: 'Connection successful' };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }
}
