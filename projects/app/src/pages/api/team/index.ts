import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    if (req.query.tree === 'true') {
      const tree = await teamService.getTeamTree(session.user.id);
      return res.status(200).json(tree);
    }
    const teams = await teamService.getUserTeams(session.user.id);
    return res.status(200).json(teams);
  } else if (req.method === 'POST') {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });
    
    try {
      if (parentId) {
        const hasPerm = await teamService.hasPermission(session.user.id, parentId, 'team:update');
        if (!hasPerm) return res.status(403).json({ error: 'No permission to create sub-team in this department' });
      }

      const team = await teamService.createTeam(name, session.user.id, parentId);
      return res.status(201).json(team);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
