import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { storageService, datasetService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

      const perm = await datasetService.checkPermission(id, session.user.id);
      if (perm !== 'owner') {
          return res.status(403).json({ error: 'Permission denied' });
      }

      try {
          await storageService.deleteFile(id);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }
  
  res.status(405).end();
}