import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { skillService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(session.user.id);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    try {
      const allSkills = await skillService.listAllSkills();
      return res.status(200).json(allSkills);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
