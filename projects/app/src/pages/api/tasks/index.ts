import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '@agentos/service/database';
import { tasks, taskArtifacts } from '@agentos/service/database/schema';
import { eq, desc, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
        try {
            const { teamId } = req.query;
            
            if (!teamId || typeof teamId !== 'string') {
                return res.status(400).json({ error: 'Missing teamId' });
            }

            const taskList = await db.query.tasks.findMany({
                where: eq(tasks.teamId, teamId),
                orderBy: [desc(tasks.createdAt)],
                limit: 50 // Pagination later
            });

            return res.status(200).json({ tasks: taskList });
        } catch (error: any) {
            console.error('Failed to list tasks:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
