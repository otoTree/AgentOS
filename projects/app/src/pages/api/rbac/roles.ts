import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { rbacService, teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET: List roles
  if (req.method === 'GET') {
    const { teamId } = req.query;
    
    // Permission check: 
    // If teamId provided, user must be member/admin of team or Root
    // If no teamId, user must be Root (to see all system roles?) -> Actually system roles are global.
    // Let's allow fetching system roles for everyone, and team roles for team members.

    if (teamId) {
        const hasAccess = await teamService.hasPermission(session.user.id, teamId as string, 'team:read');
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const roles = await rbacService.getRoles(teamId as string);
        return res.status(200).json(roles);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return res.status(500).json({ error: message });
    }
  }

  // POST: Create role
  if (req.method === 'POST') {
      const { teamId, name, description, permissions } = req.body;

      if (!teamId || !name) return res.status(400).json({ error: 'Missing required fields' });

      // Check permission: team:update or similar
      const canManage = await teamService.hasPermission(session.user.id, teamId, 'team:update');
      if (!canManage) return res.status(403).json({ error: 'Forbidden' });

      try {
          const role = await rbacService.createRole(teamId, name, description, permissions || []);
          return res.status(201).json(role);
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(500).json({ error: message });
      }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
