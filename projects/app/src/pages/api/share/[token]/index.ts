import type { NextApiRequest, NextApiResponse } from 'next';
import { shareService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token required' });
  }

  if (req.method === 'GET') {
    try {
        const info = await shareService.getShareInfo(token);
        if (!info) {
            return res.status(404).json({ error: 'Share not found or expired' });
        }
        return res.status(200).json(info);
    } catch (error: unknown) {
        return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
