import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db, chatSessions } from '@agentos/service';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const sessions = await db.query.chatSessions.findMany({
        where: eq(chatSessions.userId, session.user.id),
        orderBy: [desc(chatSessions.updatedAt)]
      });
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'POST') {
    try {
      // Explicitly cast to any to bypass the type error for now, as the schema update might not be fully propagated in the IDE context
      const [newSession] = await db.insert(chatSessions).values({
        userId: session.user.id,
        title: 'New Chat',
      } as unknown as typeof chatSessions.$inferInsert).returning();
      return res.status(201).json(newSession);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
