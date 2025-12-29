import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../../database';
import { roles, teamMembers } from '../../database/schema';
import { PERMISSIONS, SYSTEM_ROLES } from '../team/constants';

export class RbacService {
    /**
     * Get all available permissions in the system
     */
    getAllPermissions() {
        return Object.values(PERMISSIONS);
    }

    /**
     * Get all roles for a team (including system roles)
     */
    async getRoles(teamId?: string) {
        const conditions = [isNull(roles.teamId)];
        if (teamId) {
            conditions.push(eq(roles.teamId, teamId));
        }

        return await db.query.roles.findMany({
            where: or(...conditions),
            orderBy: (roles, { asc }) => [asc(roles.name)]
        });
    }

    /**
     * Create a new custom role for a team
     */
    async createRole(teamId: string, name: string, description: string, permissions: string[]) {
        // Validate permissions
        const validPerms = Object.values(PERMISSIONS);
        const filteredPerms = permissions.filter(p => validPerms.includes(p as any));

        const [role] = await db.insert(roles).values({
            name,
            description,
            permissions: filteredPerms,
            teamId,
        } as any).returning();

        return role;
    }

    /**
     * Update an existing role
     * Note: System roles cannot be updated via API (they are synced by code)
     */
    async updateRole(roleId: string, updates: { name?: string, description?: string, permissions?: string[] }, allowSystem = false) {
        const role = await db.query.roles.findFirst({
            where: eq(roles.id, roleId)
        });

        if (!role) throw new Error('Role not found');
        
        // Prevent updating system roles
        if (!role.teamId && !allowSystem) {
            throw new Error('Cannot update system roles directly');
        }

        // Validate permissions if provided
        let perms = updates.permissions;
        if (perms) {
            const validPerms = Object.values(PERMISSIONS);
            perms = perms.filter(p => validPerms.includes(p as any));
        }

        const [updatedRole] = await db.update(roles)
            .set({
                ...updates,
                permissions: perms || role.permissions,
            } as any)
            .where(eq(roles.id, roleId))
            .returning();
            
        return updatedRole;
    }

    /**
     * Delete a custom role
     */
    async deleteRole(roleId: string) {
        const role = await db.query.roles.findFirst({
            where: eq(roles.id, roleId)
        });

        if (!role) throw new Error('Role not found');
        if (!role.teamId) throw new Error('Cannot delete system roles');

        // Check if role is in use
        const inUse = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.roleId, roleId)
        });

        if (inUse) throw new Error('Role is currently assigned to members');

        await db.delete(roles).where(eq(roles.id, roleId));
        return true;
    }
}

export const rbacService = new RbacService();
