import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { datasetService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { teamId, source, parentId } = req.query;
  
  const currentSource = (source as 'personal' | 'team') || 'personal';
  const currentTeamId = typeof teamId === 'string' ? teamId : null;
  const currentParentId = typeof parentId === 'string' ? parentId : null;

  if (currentSource === 'team' && !currentTeamId) {
      return res.status(400).json({ error: 'Team ID required for team source' });
  }

  if (currentSource === 'team' && currentTeamId) {
    const isMember = await teamService.isTeamMember(currentTeamId, session.user.id);
    if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
    }
  }

  if (req.method === 'GET') {
    try {
        const result = await datasetService.list({
            parentId: currentParentId,
            teamId: currentTeamId,
            userId: session.user.id,
            source: currentSource
        });
        return res.status(200).json(result);
    } catch (e: unknown) {
        console.error(e);
        return res.status(500).json({ error: 'Failed to fetch dataset' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}