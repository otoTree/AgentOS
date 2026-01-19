import { Request, Response } from 'express';
import { modelService, db, aiModels, eq, and } from '@agentos/service';
import { z } from 'zod';

const chatSchema = z.object({
  model: z.string().optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string().nullable().optional(),
    tool_calls: z.array(z.any()).optional(),
    tool_call_id: z.string().optional()
  })),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.any()).optional()
});

const embeddingSchema = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())])
});

async function getModelId(nameOrId: string): Promise<string> {
    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nameOrId);
    if (isUUID) return nameOrId;

    // Lookup by name
    const model = await db.query.aiModels.findFirst({
        where: eq(aiModels.name, nameOrId)
    });

    if (!model) {
        throw new Error(`Model '${nameOrId}' not found`);
    }
    return model.id;
}


export const chatCompletions = async (req: Request, res: Response) => {
    try {
      const body = chatSchema.parse(req.body);
      
      let modelId: string;
      let modelName = body.model || "default";

      if (body.model) {
          modelId = await getModelId(body.model);
      } else {
          const defaultModel = await db.query.aiModels.findFirst();
          if (!defaultModel) {
              throw new Error("No AI models configured on the server");
          }
          modelId = defaultModel.id;
          modelName = defaultModel.name;
      }
      
      const result = await modelService.chatComplete(modelId, body.messages, {
          temperature: body.temperature,
          maxTokens: body.max_tokens,
          tools: body.tools
      });

      res.json({
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.content,
            tool_calls: result.toolCalls
          },
          finish_reason: 'stop'
        }],
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        }
      });
      
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ error: { message: error.message } });
    }
};

export const embeddings = async (req: Request, res: Response) => {
    try {
      const body = embeddingSchema.parse(req.body);
      const modelId = await getModelId(body.model);
      
      const result = await modelService.getEmbeddings(modelId, body.input);
      res.json(result);
      
    } catch (error: any) {
       console.error('AI Embedding Error:', error);
       res.status(500).json({ error: { message: error.message } });
    }
};

