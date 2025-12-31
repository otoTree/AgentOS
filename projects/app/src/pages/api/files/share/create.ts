import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { shareService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { fileId, type, password, expiresAt } = req.body;

  if (!fileId || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const share = await shareService.createShare({
        fileId,
        userId: session.user.id,
        type,
        password,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    
    // Construct public link
    const protoHeader = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const link = `${baseUrl}/share/${share.token}`;

    return res.status(200).json({ ...share, link });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
