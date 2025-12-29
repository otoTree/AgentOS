import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { datasetService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
      const { name, parentId, teamId } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Name required' });
      
      if (teamId) {
           const isMember = await teamService.isTeamMember(teamId, session.user.id);
           if (!isMember) return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
          const folder = await datasetService.createFolder({
              name,
              parentId,
              teamId,
              ownerId: session.user.id
          });
          return res.status(201).json(folder);
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }
  
  if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });
      
      try {
          await datasetService.deleteFolder(id, session.user.id);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}