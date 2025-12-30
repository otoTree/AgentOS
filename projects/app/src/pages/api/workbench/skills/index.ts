import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { skillService } from '@agentos/service/core/skill/service';
import { z } from 'zod';

const createSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { teamId } = req.query;
    if (!teamId || typeof teamId !== 'string') return res.status(400).json({ error: 'Team ID required' });
    
    try {
      const skills = await skillService.listSkills(teamId);
      return res.status(200).json(skills);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = createSchema.parse(req.body);
      
      const skill = await skillService.createSkill({
        teamId: body.teamId,
        name: body.name,
        description: body.description,
        emoji: body.emoji,
        isPublic: body.isPublic,
        ownerId: session.user.id
      });
      return res.status(201).json(skill);
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
