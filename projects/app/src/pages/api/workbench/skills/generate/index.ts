import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { skillGenerator } from '@agentos/service/core/skill/generator';
import { z } from 'zod';

const generateSchema = z.object({
  teamId: z.string().uuid(),
  modelId: z.string().uuid(),
  request: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    try {
      // Increase timeout for AI generation? Next.js API routes have defaults.
      // This might time out on Vercel (10s limit on free).
      // Client should ideally use polling or streaming.
      // For MVP, we wait.
      
      const body = generateSchema.parse(req.body);
      
      const result = await skillGenerator.generateSkill({
        teamId: body.teamId,
        modelId: body.modelId,
        request: body.request,
        ownerId: session.user.id
      });
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
