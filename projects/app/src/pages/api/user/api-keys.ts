import type { NextApiRequest, NextApiResponse } from 'next';
import { db, apiKeys } from '@agentos/service';
import { eq, desc, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
        const keys = await db.query.apiKeys.findMany({
            where: eq(apiKeys.userId, session.user.id),
            orderBy: [desc(apiKeys.createdAt)]
        });
        return res.status(200).json(keys);
    }
    
    if (req.method === 'POST') {
        // Create new key
        const key = `sk-${crypto.randomUUID().replace(/-/g, '')}`;
        const [newKey] = await db.insert(apiKeys).values({
            userId: session.user.id,
            key,
            name: req.body.name || 'Default Token'
        } as unknown as typeof apiKeys.$inferInsert).returning();
        return res.status(200).json(newKey);
    }

    if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID required' });

        await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)));
        return res.status(200).json({ success: true });
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
