
import { AIProvider, ProviderConfig } from './base';
import { 
    ChatOptions, 
    ChatResponse, 
    EmbeddingsOptions, 
    RerankOptions, 
    RerankResult,
    ASROptions,
    ASRResponse,
    TTSOptions,
    TTSResponse
} from '../types';
import { fetchWithRetry } from '../utils/fetch';

export class SiliconFlowProvider extends AIProvider {
    private baseUrl: string;

    constructor(config: ProviderConfig) {
        super(config);
        this.baseUrl = (config.baseUrl || 'https://api.siliconflow.cn/v1').replace(/\/$/, '');
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async chatComplete(modelName: string, messages: any[], options?: ChatOptions): Promise<ChatResponse> {
        const url = `${this.baseUrl}/chat/completions`;
        const body = {
            model: modelName,
            messages: messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens,
            stream: false,
            tools: options?.tools
        };

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`SiliconFlow Chat Error: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        return {
            content: data.choices[0]?.message?.content || null,
            toolCalls: data.choices[0]?.message?.tool_calls
        };
    }

    async getEmbeddings(modelName: string, input: string | string[], options?: EmbeddingsOptions): Promise<number[][]> {
        const url = `${this.baseUrl}/embeddings`;
        const body = {
            model: modelName,
            input: input,
            encoding_format: "float"
        };

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`SiliconFlow Embedding Error: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.data.map((item: any) => item.embedding);
    }

    async rerank(modelName: string, query: string, documents: string[] | Record<string, any>[], options?: RerankOptions): Promise<RerankResult[]> {
        const url = `${this.baseUrl}/rerank`;
        
        // Handle document format: SiliconFlow expects string[]
        const docs = documents.map(d => typeof d === 'string' ? d : JSON.stringify(d));

        const body = {
            model: modelName,
            query: query,
            documents: docs,
            top_n: options?.top_k ?? 4, // Default to 4 if not provided
            return_documents: options?.return_documents ?? true // Default to true to see results
        };

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });


        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`SiliconFlow Rerank Error: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.results.map((item: any) => ({
            index: item.index,
            relevance_score: item.relevance_score,
            document: typeof documents[item.index] === 'string' ? documents[item.index] : undefined
        }));
    }

    async transcribe(modelName: string, audioData: Blob | Buffer, options?: ASROptions): Promise<ASRResponse> {
        const url = `${this.baseUrl}/audio/transcriptions`;
        const formData = new FormData();
        
        // Handle Blob/Buffer for FormData
        if (audioData instanceof Blob) {
            formData.append('file', audioData, 'audio.mp3');
        } else {
             // Node.js Buffer
             const blob = new Blob([new Uint8Array(audioData)]);
             formData.append('file', blob, 'audio.mp3');
        }
        
        formData.append('model', modelName);
        if (options?.language) formData.append('language', options.language);
        if (options?.prompt) formData.append('prompt', options.prompt);
        if (options?.responseFormat) formData.append('response_format', options.responseFormat);

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.config.apiKey}`
        };
        // Do not set Content-Type for FormData, let fetch handle boundary

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: headers as any,
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`SiliconFlow ASR Error: ${res.status} ${errorText}`);
        }

        if (options?.responseFormat === 'srt' || options?.responseFormat === 'vtt' || options?.responseFormat === 'text') {
            const text = await res.text();
            return { text };
        }

        const data = await res.json();
        
        return {
            text: data.text,
            language: data.language
        };
    }

    async tts(modelName: string, text: string, options?: TTSOptions): Promise<TTSResponse> {
        const url = `${this.baseUrl}/audio/speech`;
        
        // Determine default voice based on model
        let defaultVoice = 'fnlp/MOSS-TTSD-v0.5:alex';
        if (modelName.toLowerCase().includes('cosyvoice')) {
            // CosyVoice requires a specific voice or reference. 
            // Since we don't have a reference in this simple interface, we try a known preset or leave it to the user.
            // According to some docs, CosyVoice might use 'fun-voice' or similar, but without definitive docs, 
            // we should rely on options.voice. 
            // If user didn't provide voice, we send a generic one that might work or fail with a helpful message.
            // However, SiliconFlow docs say: "The 'voice' field currently does not support two timbres..."
            // Let's try to use a safe default if known, otherwise fallback to the MOSS one (which might fail).
            // Better strategy: If options.voice is missing, do NOT send it if the API allows.
            // But API says 'voice' is required for some models.
            // Let's try 'fnlp/MOSS-TTSD-v0.5:alex' as fallback but prioritize options.voice.
            defaultVoice = 'fnlp/MOSS-TTSD-v0.5:alex'; 
        }

        const body: Record<string, any> = {
            model: modelName,
            input: text,
            voice: options?.voice || defaultVoice, 
            response_format: options?.responseFormat || 'mp3',
            speed: options?.speed || 1.0
        };

        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`SiliconFlow TTS Error: ${res.status} ${errorText}`);
        }

        const buffer = await res.arrayBuffer();
        return {
            audio: Buffer.from(buffer),
            format: options?.responseFormat || 'mp3'
        };
    }

    async testConnection(): Promise<{ success: boolean; message: string; models?: unknown[] }> {
        try {
            // SiliconFlow has a standard /models endpoint
            const url = `${this.baseUrl}/models`;
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
