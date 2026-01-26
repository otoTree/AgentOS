
import { eq } from 'drizzle-orm';
import { db } from '../../database';
import { aiProviders, aiModels } from '../../database/schema';
import { ProviderFactory } from './providers';
import { fetchWithRetry } from './utils/fetch';
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
} from './types';

// Simple encryption helper (placeholder)
// In production, use a proper encryption library like 'crypto' with a secret key
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const encrypt = (data: any) => data; 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decrypt = (data: any) => data;

export class ModelService {
  
  /**
   * Get all providers (without config secrets)
   */
  async getProviders() {
    const providers = await db.query.aiProviders.findMany({
        with: {
            models: true
        }
    });
    
    // Mask config
    return providers.map(p => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = p.config as any;
        return {
            ...p,
            config: {
                baseUrl: config?.baseUrl
            }
        };
    });
  }

  /**
   * Create or Update Provider
   */
  async saveProvider(data: { 
      id?: string, 
      name: string, 
      type: string, 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: any 
  }) {
    
    if (data.id) {
        // Fetch existing to merge config
        const existing = await db.query.aiProviders.findFirst({
            where: eq(aiProviders.id, data.id)
        });
        
        if (!existing) throw new Error('Provider not found');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingConfig = existing.config as any; // In real app, decrypt here
        
        // Merge config
        const newConfig = { ...existingConfig };
        
        // Only update provided fields
        if (data.config.apiKey) newConfig.apiKey = data.config.apiKey;
        if (data.config.baseUrl !== undefined) newConfig.baseUrl = data.config.baseUrl;
        
        const encryptedConfig = encrypt(newConfig);

        const [updated] = await db.update(aiProviders)
            .set({
                name: data.name,
                type: data.type,
                config: encryptedConfig,
                // isActive: true
            })
            .where(eq(aiProviders.id, data.id))
            .returning();
        return updated;
    } else {
        const encryptedConfig = encrypt(data.config);
        const [created] = await db.insert(aiProviders).values({
            name: data.name,
            type: data.type,
            config: encryptedConfig,
            // isActive: true // Defaults to true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).returning();
        return created;
    }
  }

  /**
   * Add Model to Provider
   */
  async addModel(providerId: string, data: {
      name: string,
      displayName: string,
      capabilities: string[],
      contextWindow: number
  }) {
      const [model] = await db.insert(aiModels).values({
          providerId,
          name: data.name,
          displayName: data.displayName,
          capabilities: data.capabilities,
          contextWindow: data.contextWindow,
          // isActive: true
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).returning();
      return model;
  }

  /**
   * Update Model
   */
  async updateModel(id: string, data: {
      name?: string,
      displayName?: string,
      capabilities?: string[],
      contextWindow?: number,
      isActive?: boolean
  }) {
      const [updated] = await db.update(aiModels)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .set(data as any)
          .where(eq(aiModels.id, id))
          .returning();
      return updated;
  }

  /**
   * Delete Model
   */
  async deleteModel(id: string) {
      const [deleted] = await db.delete(aiModels)
          .where(eq(aiModels.id, id))
          .returning();
      return deleted;
  }

  /**
   * Delete Provider (and associated models)
   */
  async deleteProvider(id: string) {
      // Transaction or manual cascade
      // Since we don't have CASCADE in schema defined explicitly for now, we delete models first
      await db.delete(aiModels).where(eq(aiModels.providerId, id));
      
      const [deleted] = await db.delete(aiProviders)
          .where(eq(aiProviders.id, id))
          .returning();
      return deleted;
  }

  /**
   * Get Provider Instance
   */
  private async getProviderInstance(modelId: string) {
      // 1. Get Model & Provider
      const model = await db.query.aiModels.findFirst({
          where: eq(aiModels.id, modelId),
          with: {
              provider: true
          }
      });
      
      if (!model) throw new Error('Model not found');
      if (!model.provider) throw new Error('Provider not found');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = decrypt(model.provider.config) as any;
      
      return {
          provider: ProviderFactory.create(model.provider.type, config),
          modelName: model.name,
          model
      };
  }

  /**
   * Test Provider Connection
   */
  async testConnection(providerId: string) {
      const providerConfig = await this.getProviderConfig(providerId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { type, config } = providerConfig as any;
      
      try {
          const provider = ProviderFactory.create(type, config);
          return await provider.testConnection();
      } catch (err: any) {
          console.error('Test connection error:', err);
          return { success: false, message: err.message };
      }
  }

  /**
   * Test Provider Configuration (without saving)
   */
  async testProviderConfig(type: string, config: any) {
      try {
          // Encrypt/Decrypt logic might be needed if the factory expects decrypted config
          // But here we assume 'config' passed is raw (plain text) as it comes from user input or decrypted source
          const provider = ProviderFactory.create(type, config);
          return await provider.testConnection();
      } catch (err: any) {
          console.error('Test config error:', err);
          return { success: false, message: err.message };
      }
  }

  /**
   * Get Config for internal use (e.g. LLM Client)
   */
  async getProviderConfig(providerId: string) {
      const provider = await db.query.aiProviders.findFirst({
          where: eq(aiProviders.id, providerId)
      });
      
      if (!provider) throw new Error('Provider not found');
      
      return {
          ...provider,
          config: decrypt(provider.config)
      };
  }

  /**
   * Chat Completion (Full Interface with Tools)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chatComplete(modelId: string, messages: any[], options: ChatOptions = {}): Promise<ChatResponse> {
      const { provider, modelName } = await this.getProviderInstance(modelId);
      return await provider.chatComplete(modelName, messages, options);
  }

  /**
   * Chat Completion (Simple Interface)
   */
  async chat(modelId: string, messages: { role: string, content: string }[], options: { temperature?: number, maxTokens?: number } = {}) {
      const res = await this.chatComplete(modelId, messages, options);
      return res.content || '';
  }

  /**
   * Get Embeddings
   */
  async getEmbeddings(modelId: string, input: string | string[], options?: EmbeddingsOptions): Promise<number[][]> {
      const { provider, modelName } = await this.getProviderInstance(modelId);
      return await provider.getEmbeddings(modelName, input, options);
  }

  /**
   * Automatic Speech Recognition (ASR)
   */
  async transcribe(modelId: string, audioData: Blob | Buffer, options?: ASROptions): Promise<ASRResponse> {
      const { provider, modelName } = await this.getProviderInstance(modelId);
      return await provider.transcribe(modelName, audioData, options);
  }

  /**
   * Optical Character Recognition (OCR)
   */
  async ocr(modelId: string, imageData: Blob | Buffer | string, options?: OCROptions): Promise<OCRResponse> {
      const { provider, modelName } = await this.getProviderInstance(modelId);
      return await provider.ocr(modelName, imageData, options);
  }

  /**
   * Rerank
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async rerank(modelId: string, query: string, documents: string[] | Record<string, any>[], options?: RerankOptions): Promise<RerankResult[]> {
        const { provider, modelName } = await this.getProviderInstance(modelId);
        return await provider.rerank(modelName, query, documents, options);
    }

    /**
     * Text to Speech (TTS)
     */
    async tts(modelId: string, text: string, options?: TTSOptions): Promise<TTSResponse> {
        const { provider, modelName } = await this.getProviderInstance(modelId);
        return await provider.tts(modelName, text, options);
    }

    /**
     * Test Model Capabilities
     */
    async testModel(modelId: string) {
        const { provider, modelName, model } = await this.getProviderInstance(modelId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (model.capabilities || []) as any[];
        const caps = Array.isArray(capabilities) ? capabilities : [capabilities];

        try {
            if (caps.includes('chat') || caps.includes('vision')) {
                await provider.chatComplete(modelName, [{ role: 'user', content: 'Hello' }], { maxTokens: 10 });
                return { success: true, message: 'Chat/Vision test successful' };
            }
            
            if (caps.includes('embedding')) {
                await provider.getEmbeddings(modelName, 'Hello');
                return { success: true, message: 'Embedding test successful' };
            }
            
            if (caps.includes('rerank')) {
                await provider.rerank(modelName, 'test', ['test document']);
                return { success: true, message: 'Rerank test successful' };
            }
            
            if (caps.includes('tts')) {
                await provider.tts(modelName, 'Hello');
                return { success: true, message: 'TTS test successful' };
            }
            
            if (caps.includes('transcribe')) {
                // Minimal valid WAV header (36 bytes) + 4 bytes data chunk header = 40 bytes + 0 data
                // Actually let's just send a small buffer, hopefully provider validates format or returns error that implies connectivity
                // Create a 1-second silence WAV file (8kHz, Mono, 8-bit)
                // Header (44 bytes) + Data (8000 bytes)
                const sampleRate = 8000;
                const numChannels = 1;
                const bitsPerSample = 8;
                const duration = 1;
                const dataSize = sampleRate * numChannels * (bitsPerSample / 8) * duration;
                const fileSize = 36 + dataSize;
                
                const buffer = Buffer.alloc(44 + dataSize);
                
                // RIFF chunk descriptor
                buffer.write('RIFF', 0);
                buffer.writeUInt32LE(fileSize, 4);
                buffer.write('WAVE', 8);
                
                // fmt sub-chunk
                buffer.write('fmt ', 12);
                buffer.writeUInt32LE(16, 16); // Subchunk1Size
                buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
                buffer.writeUInt16LE(numChannels, 22);
                buffer.writeUInt32LE(sampleRate, 24);
                buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
                buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
                buffer.writeUInt16LE(bitsPerSample, 34);
                
                // data sub-chunk
                buffer.write('data', 36);
                buffer.writeUInt32LE(dataSize, 40);
                
                // Silence (0x80 for 8-bit PCM)
                buffer.fill(0x80, 44);

                try {
                    await provider.transcribe(modelName, buffer);
                    return { success: true, message: 'Transcribe test successful' };
                } catch (e: any) {
                    // If it's a model error (like "audio too short"), it means connection is fine.
                    // If it's 401/404/500, it's a failure.
                    if (e.message.includes('401') || e.message.includes('403') || e.message.includes('404') || e.message.includes('500') || e.message.includes('Connection refused')) {
                        throw e;
                    }
                     return { success: true, message: `Transcribe test reachable (Error: ${e.message})` };
                }
            }
            
            // Fallback
            return await provider.testConnection();

        } catch (error: any) {
            console.error('Test Model Failed:', error);
            // Return full error details if available
            return { success: false, message: `Test failed: ${error.message}` };
        }
    }
}

export const modelService = new ModelService();
