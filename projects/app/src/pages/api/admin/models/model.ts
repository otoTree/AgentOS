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
      const { providerId, ...data } = req.body;
      const model = await modelService.addModel(providerId, data);
      return res.status(201).json(model);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to add model' });
    }
  }

  if (req.method === 'PUT') {
      try {
          const { id, ...data } = req.body;
          if (!id) return res.status(400).json({ error: 'ID required' });
          const updated = await modelService.updateModel(id, data);
          return res.status(200).json(updated);
      } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'Failed to update model' });
      }
  }

  if (req.method === 'DELETE') {
      try {
          const { id } = req.query;
          if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });
          const deleted = await modelService.deleteModel(id);
          return res.status(200).json(deleted);
      } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'Failed to delete model' });
      }
  }

  res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
