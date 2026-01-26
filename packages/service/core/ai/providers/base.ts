
import { 
    ASROptions, 
    ASRResponse, 
    ChatOptions, 
    ChatResponse, 
    EmbeddingsOptions, 
    OCROptions, 
    OCRResponse, 
    RerankOptions, 
    RerankResult,
    TTSOptions,
    TTSResponse
} from '../types';

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export abstract class AIProvider {
    protected config: ProviderConfig;

    constructor(config: ProviderConfig) {
        this.config = config;
    }

    abstract chatComplete(
        modelName: string, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: any[], 
        options?: ChatOptions
    ): Promise<ChatResponse>;

    abstract getEmbeddings(
        modelName: string, 
        input: string | string[], 
        options?: EmbeddingsOptions
    ): Promise<number[][]>;

    // Optional capabilities
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async transcribe(modelName: string, audioData: Blob | Buffer, options?: ASROptions): Promise<ASRResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async tts(modelName: string, text: string, options?: TTSOptions): Promise<TTSResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ocr(modelName: string, imageData: Blob | Buffer | string, options?: OCROptions): Promise<OCRResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async rerank(modelName: string, query: string, documents: string[] | Record<string, any>[], options?: RerankOptions): Promise<RerankResult[]> {
        throw new Error('Method not implemented.');
    }

    async testConnection(): Promise<{ success: boolean; message: string; models?: unknown[] }> {
        return { success: true, message: 'Connection check not implemented' };
    }
}
