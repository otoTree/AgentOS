import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { storageService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { teamId, source } = req.query;
  
  if (source === 'personal') {
      try {
          const files = await storageService.getPersonalFiles(session.user.id);
          return res.status(200).json(files);
      } catch {
          return res.status(500).json({ error: 'Failed to fetch personal files' });
      }
  }

  if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID required' });
  }

  if (req.method === 'GET') {
    // Check Team Membership
    const isMember = await teamService.isTeamMember(teamId, session.user.id);
    if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const files = await storageService.getTeamFiles(teamId);
        return res.status(200).json(files);
    } catch {
        return res.status(500).json({ error: 'Failed to fetch files' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
