import type { NextApiRequest, NextApiResponse } from 'next';
import { shareService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token required' });
  }

  if (req.method === 'GET') {
      try {
          // Try to get download URL without password (works for public shares)
          const url = await shareService.getDownloadUrl(token);
          return res.redirect(url);
      } catch (error: unknown) {
          if ((error as Error).message === 'Invalid password') {
               // Password required, redirect to share page
               return res.redirect(`/share/${token}`);
          }
          return res.status(404).json({ error: 'File not found or expired' });
      }
  }

  if (req.method === 'POST') {
    const { password } = req.body;
    try {
        const url = await shareService.getDownloadUrl(token, password);
        return res.status(200).json({ url });
    } catch (error: unknown) {
        if ((error as Error).message === 'Invalid password') {
            return res.status(403).json({ error: 'Invalid password' });
        }
        if ((error as Error).message === 'Share link expired') {
            return res.status(410).json({ error: 'Share link expired' });
        }
        return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
