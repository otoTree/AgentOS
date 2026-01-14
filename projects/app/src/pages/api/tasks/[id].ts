import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '@agentos/service/database';
import { tasks } from '@agentos/service/database/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing task ID' });
    }

    if (req.method === 'GET') {
        try {
            const task = await db.query.tasks.findFirst({
                where: eq(tasks.id, id)
            });

            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }

            return res.status(200).json({ task });
        } catch (error: any) {
            console.error(`Failed to get task ${id}:`, error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
