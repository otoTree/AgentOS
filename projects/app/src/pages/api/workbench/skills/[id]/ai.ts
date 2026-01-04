import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { CoderAgent, ServiceLLMClient } from '@agentos/coder';
import { z } from 'zod';

const aiSchema = z.object({
  instruction: z.string().optional(),
  errorLog: z.string().optional(),
  modelId: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

  if (req.method === 'POST') {
    try {
      const body = aiSchema.parse(req.body);
      
      const llmClient = new ServiceLLMClient(body.modelId);
      const agent = new CoderAgent(id, llmClient);
      
      // Determine input
      let input = body.instruction || 'Improve the code.';
      if (body.errorLog) {
        input = `I encountered an error:\n${body.errorLog}\nPlease fix the code.`;
      }
      
      const result = await agent.run(input);
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
