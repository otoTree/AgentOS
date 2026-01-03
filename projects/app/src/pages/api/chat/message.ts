import { NextApiRequest, NextApiResponse } from 'next';
import { SuperAgent } from '@agentos/superagent';
import { AppLLMClient } from '@/utils/superagent-adapter';
import { db } from '@agentos/service/database';
import { weatherTool } from '@agentos/service/core/tool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    // Find a valid model (e.g., gpt-3.5-turbo or gpt-4)
    // For simplicity, just pick the first one
    const model = await db.query.aiModels.findFirst({
        with: {
            provider: true
        }
    });

    if (!model) {
      return res.status(500).json({ error: 'No AI models configured' });
    }

    const agent = new SuperAgent({
      model: model.name,
      prompts: {
        system: 'You are a helpful assistant.',
        user: '{{input}}'
      },
      tools: [weatherTool],
      llmClient: new AppLLMClient(model.id),
      toolCallMethod: 'native'
    });

    const response = await agent.run(message || 'Hello');

    res.status(200).json({ response });
  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}
