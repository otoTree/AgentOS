import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { skillGenerator } from '@agentos/service/core/skill/generator';
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
      
      // Enable Streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const result = await skillGenerator.refineSkill({
        skillId: id,
        modelId: body.modelId,
        instruction: body.instruction,
        errorLog: body.errorLog,
        onProgress: {
            onStep: (step) => {
                res.write(`data: ${JSON.stringify({ type: 'step', step })}\n\n`);
            }
        }
      });
      
      res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
      res.end();
    } catch (error: unknown) {
      console.error(error);
      if (!res.headersSent) {
          return res.status(500).json({ error: (error as Error).message });
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: (error as Error).message })}\n\n`);
      res.end();
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
