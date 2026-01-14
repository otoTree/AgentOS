import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '@agentos/service/database';
import { taskArtifacts } from '@agentos/service/database/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query; // This is taskId from file path tasks/[id]/artifacts.ts? No, file path is [id]/artifacts.ts so id is taskId
    
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing task ID' });
    }

    if (req.method === 'GET') {
        try {
            const artifacts = await db.query.taskArtifacts.findMany({
                where: eq(taskArtifacts.taskId, id)
            });

            return res.status(200).json({ artifacts });
        } catch (error: any) {
            console.error(`Failed to get artifacts for task ${id}:`, error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
