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
      const { providerId, type, config, modelId } = req.body;
      
      let result;
      if (modelId) {
          result = await modelService.testModel(modelId);
      } else if (providerId) {
         result = await modelService.testConnection(providerId);
      } else if (type && config) {
         result = await modelService.testProviderConfig(type, config);
      } else {
         return res.status(400).json({ error: 'Missing providerId, modelId or type/config' });
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Test connection error:', error);
      return res.status(500).json({ error: error.message || 'Failed to test connection' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
