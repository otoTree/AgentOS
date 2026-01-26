
import { AIProvider, ProviderConfig } from './base';
import { fetchWithRetry } from '../utils/fetch';
import { 
    ChatOptions, 
    ChatResponse, 
    EmbeddingsOptions, 
    ASROptions, 
    ASRResponse 
} from '../types';

export class OpenAIProvider extends AIProvider {
    
    private getBaseUrl(path: string): string {
        const base = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        return `${base}${path}`;
    }

    private getHeaders(contentType: string | null = 'application/json'): Record<string, string> {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async chatComplete(modelName: string, messages: any[], options: ChatOptions = {}): Promise<ChatResponse> {
        const url = this.getBaseUrl('/chat/completions');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            model: modelName,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            stream: false
        };
        
        if (options.tools && options.tools.length > 0) {
            body.tools = options.tools;
        }

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`OpenAI API Error: ${res.status} ${error}`);
        }

        const data = await res.json();
        const message = data.choices[0].message;
        
        let toolCalls = undefined;
        if (message.tool_calls) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toolCalls = message.tool_calls.map((tc: any) => {
                let args = {};
                try {
                    args = JSON.parse(tc.function.arguments);
                } catch (e) {
                    console.warn(`Failed to parse tool arguments for ${tc.function.name}:`, tc.function.arguments);
                    try {
                        const cleaned = tc.function.arguments.replace(/```json\n?|\n?```/g, '');
                        args = JSON.parse(cleaned);
                    } catch (e2) {
                        const match = tc.function.arguments.match(/\{[\s\S]*\}/);
                        if (match) {
                            try {
                                args = JSON.parse(match[0]);
                            } catch (e3) {
                                args = { raw_args: tc.function.arguments, error: 'parse_failed' };
                            }
                        } else {
                                args = { raw_args: tc.function.arguments, error: 'parse_failed' };
                        }
                    }
                }
                
                return {
                    id: tc.id,
                    name: tc.function.name,
                    arguments: args
                };
            });
        }

        return {
            content: message.content,
            toolCalls
        };
    }

    async getEmbeddings(modelName: string, input: string | string[], options?: EmbeddingsOptions): Promise<number[][]> {
        const url = this.getBaseUrl('/embeddings');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            model: modelName,
            input
        };

        if (options?.dimensions) {
            body.dimensions = options.dimensions;
        }

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`OpenAI API Error: ${res.status} ${error}`);
        }

        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.data.map((item: any) => item.embedding);
    }

    async transcribe(modelName: string, audioData: Blob | Buffer, options: ASROptions = {}): Promise<ASRResponse> {
        const url = this.getBaseUrl('/audio/transcriptions');
        
        const formData = new FormData();
        formData.append('model', modelName);
        
        // Handle Buffer vs Blob
        if (audioData instanceof Buffer) {
            // Convert Buffer to Blob for FormData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blob = new Blob([audioData as any]);
            formData.append('file', blob, 'audio.mp3'); // Default filename
        } else {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formData.append('file', audioData as any, 'audio.mp3');
        }

        if (options.language) formData.append('language', options.language);
        if (options.prompt) formData.append('prompt', options.prompt);
        if (options.responseFormat) formData.append('response_format', options.responseFormat);
        
        // Note: OpenAI doesn't natively support speaker diarization in the basic API usually, 
        // but let's assume standard parameters.
        
        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(null), // Let fetch set Content-Type for FormData
            body: formData
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`OpenAI ASR Error: ${res.status} ${error}`);
        }

        const data = await res.json();
        
        // Map OpenAI response to ASRResponse
        // OpenAI verbose_json format includes segments
        return {
            text: data.text,
            language: data.language,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            segments: data.segments?.map((s: any) => ({
                start: s.start,
                end: s.end,
                text: s.text
            }))
        };
    }

    async testConnection(): Promise<{ success: boolean; message: string; models?: unknown[] }> {
        try {
            const url = this.getBaseUrl('/models');
            const res = await fetchWithRetry(url, {
                headers: this.getHeaders(),
                timeout: 10000
            });
            
            if (!res.ok) {
                const error = await res.text();
                throw new Error(`Connection Failed: ${res.status} ${error}`);
            }
            
            const data = await res.json();
            return { success: true, models: data.data, message: 'Connection successful' };
        } catch (err: any) {
             return { success: false, message: err.message };
        }
    }
}
