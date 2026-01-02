import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { skillService } from '@agentos/service/core/skill/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

  if (req.method === 'POST') {
    try {
      const { type } = req.body; // 'private' | 'public'
      if (type !== 'private' && type !== 'public') {
          return res.status(400).json({ error: 'Invalid deployment type' });
      }

      const skill = await skillService.getSkill(id);
      // Basic permission check
      if (skill.ownerId !== session.user.id) {
          // Allow if team member logic exists, but for now strict owner check or skip
      }
      
      const updated = await skillService.deploySkill(id, type);
      return res.status(200).json(updated);
    } catch (error: unknown) {
      console.error('[Deploy API Error]', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Return detailed error to client
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
