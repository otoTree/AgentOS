import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { modelService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      // TODO: Add strict admin check
      const provider = await modelService.saveProvider(req.body);
      return res.status(201).json(provider);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to save provider' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Invalid ID' });
      }
      const deleted = await modelService.deleteProvider(id);
      return res.status(200).json(deleted);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete provider' });
    }
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
