import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db, skills } from '@agentos/service';
import { eq, or, and, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      // 获取用户的 Team ID (目前假设用户属于某个 Team，或者我们查找用户所在的所有 Teams)
      // 简化起见，我们假设是单租户或用户有一个主 Team。
      // 在实际 AgentOS 代码中，通常通过 Header 或 Session 获取当前 active team。
      // 这里我们先获取用户所有的 skills (own/team) 和 public skills。
      
      // 1. 获取用户所在 Team 的 ID (需要 teamService，这里暂时简化，直接查 skills)
      // 由于没有直接的 currentTeamId，我们查询:
      // a. Public Skills (isPublic = true AND publicDeployedAt IS NOT NULL)
      // b. Team Skills (我们暂时假设用户能看到所有 Private Deployed Skills，或者基于 ownerId)
      
      // 更好的做法是查询所有 deployments，关联 skill，过滤条件：
      // (Skill is Public) OR (Skill.ownerId == user.id) OR (Skill.teamId IN userTeams)
      
      // 鉴于目前只能拿到 user.id，我们先返回:
      // 1. Public Skills (Marketplace)
      // 2. User's Own Skills (Private)
      
      const allSkills = await db.query.skills.findMany({
        where: or(
            and(eq(skills.isPublic, true), /* isDeployedPublicly check implicit or explicit field */),
            eq(skills.ownerId, session.user.id)
        ),
        with: {
            deployments: true,
            owner: true
        },
        orderBy: [desc(skills.updatedAt)]
      });

      // Filter only those with successful deployments
      const availableSkills = allSkills.map(skill => {
        // Find relevant deployments
        // const publicDeployment = skill.deployments.find(d => d.type === 'public' && d.status === 'running'); // Assuming 'running' or just exist
        // const privateDeployment = skill.deployments.find(d => d.type === 'private'); // Private usually assumes running in sandbox on demand

        // Determine if available
        let available = false;
        let type = '';

        if (skill.isPublic && skill.publicDeployedAt) {
            available = true;
            type = 'public';
        } else if (skill.ownerId === session.user.id && skill.privateDeployedAt) {
            available = true;
            type = 'private';
        }

        if (!available) return null;

        return {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            emoji: skill.emoji,
            type: type,
            owner: skill.owner.name,
            updatedAt: skill.updatedAt
        };
      }).filter(Boolean);

      return res.status(200).json(availableSkills);
    } catch (error: unknown) {
      console.error(error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
