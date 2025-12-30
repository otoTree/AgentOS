import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { teamService, systemService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(session.user.id);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    const multiTeamMode = await systemService.isMultiTeamMode();
    return res.status(200).json({
        multi_team_mode: multiTeamMode
    });
  } else if (req.method === 'POST') {
    const { multi_team_mode } = req.body;
    
    if (typeof multi_team_mode === 'boolean') {
        await systemService.setMultiTeamMode(multi_team_mode);
        return res.status(200).json({ success: true, multi_team_mode });
    } else {
        return res.status(400).json({ error: 'Invalid payload' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
