import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { teamService } from '@agentos/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const teamId = Array.isArray(id) ? id[0] : id;
  if (!teamId) return res.status(400).json({ error: 'Team ID required' });

  if (req.method === 'GET') {
    try {
        const members = await teamService.getTeamMembers(teamId);
        return res.status(200).json(members);
    } catch {
        return res.status(500).json({ error: 'Failed to fetch members' });
    }
  } else if (req.method === 'POST') {
    const { email, role } = req.body;
    
    // Check if requester is Admin/Owner
    const canAdd = await teamService.hasPermission(session.user.id, teamId, 'member:add');
    if (!canAdd) return res.status(403).json({ error: 'Forbidden' });

    try {
      const member = await teamService.addMember(teamId, email, role);
      return res.status(201).json(member);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return res.status(400).json({ error: message });
    }
  } else if (req.method === 'PUT') {
      const { userId, roleId } = req.body;
      
      // Check if requester can update members
      const canUpdate = await teamService.hasPermission(session.user.id, teamId, 'member:update');
      if (!canUpdate) return res.status(403).json({ error: 'Forbidden' });

      try {
          await teamService.updateMemberRole(teamId, userId, roleId);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(400).json({ error: message });
      }
  } else if (req.method === 'DELETE') {
      const { userId } = req.body; // Expect userId in body for DELETE, or query? Typically body is fine but sometimes ignored.
      // Better to use query param if strictly RESTful, but let's check body first.
      const targetUserId = userId || req.query.userId;

      if (!targetUserId) return res.status(400).json({ error: 'User ID required' });

      try {
          await teamService.removeMember(session.user.id, teamId, targetUserId as string);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(400).json({ error: message });
      }
  } else if (req.method === 'PATCH') {
      const { action, userId, targetTeamId } = req.body;

      if (action === 'move') {
          if (!userId || !targetTeamId) return res.status(400).json({ error: 'Missing parameters' });
          
          try {
              await teamService.moveMember(session.user.id, userId, teamId, targetTeamId);
              return res.status(200).json({ success: true });
          } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Unknown error';
              return res.status(400).json({ error: message });
          }
      }
      return res.status(400).json({ error: 'Invalid action' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
