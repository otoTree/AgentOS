import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { rbacService, teamService } from '@agentos/service';
import { db } from '@agentos/service/database';
import { roles } from '@agentos/service/database/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const roleId = Array.isArray(id) ? id[0] : id;
  if (!roleId) return res.status(400).json({ error: 'Role ID required' });

  // Helper to check ownership of role
  const checkRoleAccess = async () => {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
      if (!role) throw new Error('Role not found');
      
      const isRoot = await teamService.isRoot(session.user.id);

      if (!role.teamId) {
          if (!isRoot) {
            throw new Error('Cannot modify system roles');
          }
          // Root can modify system roles
          return { role, isSystem: true, isRoot: true };
      }

      const canManage = await teamService.hasPermission(session.user.id, role.teamId, 'team:update');
      if (!canManage) throw new Error('Forbidden');
      
      return { role, isSystem: false, isRoot };
  };

  if (req.method === 'PUT') {
      try {
          const { isSystem } = await checkRoleAccess();
          const { name, description, permissions } = req.body;
          // Pass allowSystem=true if isSystem is true (which implies isRoot passed check)
          const updated = await rbacService.updateRole(roleId, { name, description, permissions }, isSystem);
          return res.status(200).json(updated);
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          return res.status(message === 'Forbidden' ? 403 : 400).json({ error: message });
      }
  }

  if (req.method === 'DELETE') {
      try {
          const { isSystem } = await checkRoleAccess();
          if (isSystem) throw new Error('Cannot delete system roles');
          
          await rbacService.deleteRole(roleId);
          return res.status(200).json({ success: true });
      } catch (e: unknown) {
           const message = e instanceof Error ? e.message : 'Unknown error';
           return res.status(message === 'Forbidden' ? 403 : 400).json({ error: message });
      }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
