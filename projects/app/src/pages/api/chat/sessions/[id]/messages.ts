import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { db, chatMessages, chatSessions } from '@agentos/service';
import { eq, asc, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Session ID required' });

  // Verify ownership
  const chatSession = await db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id))
  });

  if (!chatSession) return res.status(404).json({ error: 'Session not found' });

  if (req.method === 'GET') {
    try {
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, id),
        orderBy: [asc(chatMessages.createdAt)]
      });
      return res.status(200).json(messages);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
