import { eq } from 'drizzle-orm';
import { db } from '../../database';
import { aiProviders, aiModels } from '../../database/schema';

// Simple encryption helper (placeholder)
// In production, use a proper encryption library like 'crypto' with a secret key
const encrypt = (data: any) => data; 
const decrypt = (data: any) => data;

/**
 * Fetch with retry and timeout
 */
async function fetchWithRetry(url: string, options: RequestInit & { timeout?: number, retries?: number } = {}) {
    const { timeout = 60000, retries = 2, ...fetchOptions } = options;
    
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (err: any) {
            clearTimeout(id);
            lastError = err;
            
            // Only retry on network errors or timeouts
            const isNetworkError = err.name === 'AbortError' || err.message.includes('fetch failed') || err.message.includes('timeout');
            
            if (isNetworkError && i < retries) {
                console.warn(`Fetch failed (attempt ${i + 1}/${retries + 1}), retrying...`, err.message);
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

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
      config: any 
  }) {
    
    if (data.id) {
        // Fetch existing to merge config
        const existing = await db.query.aiProviders.findFirst({
            where: eq(aiProviders.id, data.id)
        });
        
        if (!existing) throw new Error('Provider not found');

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
   * Test Provider Connection
   */
  async testConnection(providerId: string) {
      const provider = await this.getProviderConfig(providerId);
      const { type, config: { apiKey, baseUrl } } = provider;

      try {
            if (type === 'openai' || type === 'local') {
                const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/models';
                const res = await fetchWithRetry(url, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    timeout: 10000 // Test connection can have a shorter timeout
                });
                
                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(`Connection Failed: ${res.status} ${error}`);
                }
                
                const data = await res.json();
                return { success: true, models: data.data, message: 'Connection successful' };
            } 
            
            if (type === 'anthropic') {
                // Anthropic doesn't have a standard models endpoint that works exactly like OpenAI's in all cases,
                // but let's try the standard one if available or just assume success if we don't crash? 
                // Better: try to list models if possible, otherwise just return not implemented for now or try a dummy request.
                // Anthropic GET /v1/models is available.
                const url = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '') + '/models';
                const res = await fetchWithRetry(url, {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 10000
                });

                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(`Connection Failed: ${res.status} ${error}`);
                }
                 
                return { success: true, message: 'Connection successful' };
            }
          
          throw new Error(`Unsupported provider type: ${type}`);
      } catch (err: any) {
          console.error('Test connection error:', err);
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
  async chatComplete(modelId: string, messages: any[], options: { temperature?: number, maxTokens?: number, tools?: any[] } = {}) {
      // 1. Get Model & Provider
      const model = await db.query.aiModels.findFirst({
          where: eq(aiModels.id, modelId),
          with: {
              provider: true
          }
      });
      
      if (!model) throw new Error('Model not found');
      if (!model.provider) throw new Error('Provider not found');

      const config = decrypt(model.provider.config) as any;
      const { apiKey, baseUrl } = config;
      const type = model.provider.type;

      // 2. Call API based on type
      if (type === 'openai' || type === 'local') {
          const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions';
          const body: any = {
              model: model.name,
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
              headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
              },
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
              toolCalls = message.tool_calls.map((tc: any) => {
                  let args = {};
                  try {
                      args = JSON.parse(tc.function.arguments);
                  } catch (e) {
                      console.warn(`Failed to parse tool arguments for ${tc.function.name}:`, tc.function.arguments);
                      // Try to fix common JSON issues or extract from markdown
                      try {
                          const cleaned = tc.function.arguments.replace(/```json\n?|\n?```/g, '');
                          args = JSON.parse(cleaned);
                      } catch (e2) {
                          // If still fails, return raw string in a wrapper or empty
                          // But tool execution will likely fail.
                          // Let's try to extract first valid JSON object
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

      if (type === 'anthropic') {
          // Anthropic Tool Use implementation is complex, skip for now or implement basic
          const url = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '') + '/messages';
          const systemMsg = messages.find(m => m.role === 'system');
          const userMessages = messages.filter(m => m.role !== 'system');
          
          const body: any = {
              model: model.name,
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
              headers: {
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'Content-Type': 'application/json'
              },
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

      throw new Error(`Unsupported provider type: ${type}`);
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
  async getEmbeddings(modelId: string, input: string | string[]) {
      // 1. Get Model & Provider
      const model = await db.query.aiModels.findFirst({
          where: eq(aiModels.id, modelId),
          with: {
              provider: true
          }
      });
      
      if (!model) throw new Error('Model not found');
      if (!model.provider) throw new Error('Provider not found');

      const config = decrypt(model.provider.config) as any;
      const { apiKey, baseUrl } = config;
      const type = model.provider.type;

      if (type === 'openai' || type === 'local') {
          const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/embeddings';
          
          const res = await fetchWithRetry(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  model: model.name,
                  input
              })
          });

          if (!res.ok) {
              const error = await res.text();
              throw new Error(`OpenAI API Error: ${res.status} ${error}`);
          }

          const data = await res.json();
          return data;
      }
      
      throw new Error(`Provider type ${type} does not support embeddings`);
  }
}

export const modelService = new ModelService();
