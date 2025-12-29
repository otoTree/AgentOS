import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { datasetService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
      const { fileId, teamId, permission } = req.body;
      
      const perm = await datasetService.checkPermission(fileId, session.user.id);
      if (perm !== 'owner') {
          return res.status(403).json({ error: 'Only owner can share' });
      }
      
      try {
          const result = await datasetService.shareFile(fileId, teamId, permission || 'read');
          return res.status(200).json(result);
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }
  
  if (req.method === 'DELETE') {
      const { fileId, teamId } = req.query;
      
      if (!fileId || !teamId) return res.status(400).json({ error: 'Missing params' });

      const perm = await datasetService.checkPermission(fileId as string, session.user.id);
      if (perm !== 'owner') {
          return res.status(403).json({ error: 'Only owner can unshare' });
      }

      try {
          await datasetService.unshareFile(fileId as string, teamId as string);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }
  
  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}