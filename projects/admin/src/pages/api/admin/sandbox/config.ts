import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { teamService, sandboxClient } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Verify Root
  const isRoot = await teamService.isRoot(userId);
  if (!isRoot) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    try {
      const config = await sandboxClient.getConfig();
      return res.status(200).json(config);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { allowedDomains } = req.body;
      
      if (!Array.isArray(allowedDomains)) {
        return res.status(400).json({ error: 'allowedDomains must be an array of strings' });
      }

      await sandboxClient.updateAllowedDomains(allowedDomains);
      
      // Return updated config
      const config = await sandboxClient.getConfig();
      return res.status(200).json(config);
    } catch (error) {
      console.error('Config update error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
