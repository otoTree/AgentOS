import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { skillService } from '@agentos/service';
import { db } from '@agentos/service/database';
import { teamMembers } from '@agentos/service/database/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      // Get user's teams
      const userTeams = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, session.user.id)
      });
      
      const teamIds = userTeams.map(t => t.teamId);
      
      if (teamIds.length === 0) {
          return res.status(200).json([]);
      }

      // Fetch deployments for all teams
      const allDeployments = [];
      for (const tid of teamIds) {
         const deps = await skillService.listDeployments(tid);
         allDeployments.push(...deps);
      }
      
      // Transform to frontend format
      const mapped = allDeployments.map(d => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        serviceId: d.skillId,
        skillName: d.skillName, // Added in service
        skillEmoji: d.skillEmoji,
        type: d.type,
        url: d.url
      }));

      return res.status(200).json(mapped);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
