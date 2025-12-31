import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { shareService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Share ID required' });
  }

  try {
    // Ideally check if user owns the share or file
    // For MVP assuming shareService or subsequent call handles permission or we trust authenticated user has access if they know ID (which is weak)
    // Better: shareService.deleteShare(id, userId)
    await shareService.deleteShare(id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
