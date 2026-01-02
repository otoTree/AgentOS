import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { shareService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') return res.status(400).json({ error: 'File ID required' });
  
  try {
      const shares = await shareService.getFileShares(fileId);
      
      const protoHeader = req.headers['x-forwarded-proto'];
      const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const sharesWithLinks = shares.map(s => ({
          ...s,
          link: `${baseUrl}/api/share/${s.token}/download`
      }));

      return res.status(200).json(sharesWithLinks);
  } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
  }
}
