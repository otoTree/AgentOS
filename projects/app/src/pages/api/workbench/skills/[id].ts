import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { skillService } from '@agentos/service/core/skill/service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

  if (req.method === 'GET') {
    try {
      const skill = await skillService.getSkill(id);
      return res.status(200).json(skill);
    } catch (error: unknown) {
      console.error(error);
      return res.status(404).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = updateSchema.parse(req.body);
      const skill = await skillService.updateSkillMeta(id, body);
      return res.status(200).json(skill);
    } catch (error: unknown) {
      console.error(error);
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await skillService.deleteSkill(id);
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
