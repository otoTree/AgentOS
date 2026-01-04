import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database';
import { teams, teamMembers, roles, users } from '../../database/schema';
import { SYSTEM_ROLES } from './constants';

export class TeamService {
  /**
   * Sync System Roles to Database
   * Ensures that the system roles (Owner, Admin, Member) have the latest permissions defined in code.
   */
  async syncSystemRoles() {
    // Upsert System Roles
    for (const roleKey of Object.keys(SYSTEM_ROLES)) {
        const roleDef = SYSTEM_ROLES[roleKey as keyof typeof SYSTEM_ROLES];
        
        // Check if exists
        const existing = await db.query.roles.findFirst({
            where: and(eq(roles.name, roleDef.name), isNull(roles.teamId))
        });

        if (existing) {
            // Update permissions
            await db.update(roles)
                .set({
                    description: roleDef.description,
                    permissions: roleDef.permissions
                } as any)
                .where(eq(roles.id, existing.id));
        } else {
            // Create
            await db.insert(roles).values({
                name: roleDef.name,
                description: roleDef.description,
                permissions: roleDef.permissions,
                teamId: null,
            } as any);
        }
    }
  }

  /**
   * Check if a user is the Root user (God mode)
   */
  async isRoot(userId: string) {
      const rootEmail = process.env.ROOT_EMAIL || 'root@agentos.local';
      const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { email: true }
      });
      return user?.email === rootEmail;
  }

  async getRootTeamId() {
      const rootEmail = process.env.ROOT_EMAIL || 'root@agentos.local';
      const rootUser = await db.query.users.findFirst({
          where: eq(users.email, rootEmail),
          columns: { id: true }
      });
      if (!rootUser) return null;

      // Find first team owned by root
      const team = await db.query.teams.findFirst({
          where: eq(teams.ownerId, rootUser.id),
          orderBy: (teams, { asc }) => [asc(teams.createdAt)]
      });
      return team?.id;
  }

  /**
   * Create a new team and assign the creator as Owner.
   */
  async createTeam(name: string, ownerId: string, parentId?: string) {
    return await db.transaction(async (tx) => {
      // 1. Create Team
      const [team] = await tx.insert(teams).values({
        name,
        ownerId,
        parentId: parentId || null
      } as any).returning();

      // 2. Get 'Owner' System Role
      let ownerRole = await tx.query.roles.findFirst({
        where: and(eq(roles.name, SYSTEM_ROLES.OWNER.name), isNull(roles.teamId))
      });

      // Lazy seed if missing (though syncSystemRoles should be called on startup)
      if (!ownerRole) {
         [ownerRole] = await tx.insert(roles).values({
            ...SYSTEM_ROLES.OWNER,
            teamId: null,
         } as any).returning();
      }

      // 3. Add Owner as Member
      await tx.insert(teamMembers).values({
        teamId: team.id,
        userId: ownerId,
        roleId: ownerRole!.id,
      } as any);

      return team;
    });
  }

  /**
   * Get all teams for a user (Flat list, legacy support)
   */
  async getUserTeams(userId: string) {
    // If Root, return all teams
    if (await this.isRoot(userId)) {
        return await db.query.teams.findMany();
    }

    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      with: {
        team: true,
        role: true,
      }
    });
    return members.map(m => ({ ...m.team, role: m.role }));
  }

  /**
   * Get Team Tree for a user
   * - Root: All teams in tree structure
   * - User: Teams they are member of + subteams if they are admin
   */
  async getTeamTree(userId: string) {
    let allTeams: any[] = [];

    if (await this.isRoot(userId)) {
        allTeams = await db.query.teams.findMany();
    } else {
        // 1. Get teams user is member of
        const members = await db.query.teamMembers.findMany({
            where: eq(teamMembers.userId, userId),
            with: { team: true, role: true }
        });
        
        // 2. Collect IDs (unused, but kept for logic clarity if needed later, removed for lint)
        // const teamIds = new Set(members.map(m => m.teamId));
        
        // 3. For teams where user is Admin/Owner, get descendants
        // Let's try to get all teams and filter in memory for now (assuming < 1000 teams).
        const allSystemTeams = await db.query.teams.findMany();
        
        const validTeamIds = new Set<string>();
        
        members.forEach(m => {
            validTeamIds.add(m.teamId);
        });

        // Add descendants if admin
        // Function to add children recursively
        const addChildren = (parentId: string) => {
            allSystemTeams.forEach(t => {
                if ((t as any).parentId === parentId) {
                    validTeamIds.add((t as any).id);
                    addChildren((t as any).id);
                }
            });
        };

        members.forEach(m => {
            const perms = m.role.permissions as string[];
            if (perms.includes('*') || perms.includes('team:update')) { // Admin-like
                addChildren(m.teamId);
            }
        });

        allTeams = allSystemTeams.filter(t => validTeamIds.has((t as any).id));
    }

    // Build Tree
    return this.buildTree(allTeams);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildTree(teams: any[], parentId: string | null = null): any[] {
    const children = teams
        .filter(team => team.parentId === parentId)
        .map(team => ({
            ...team,
            children: this.buildTree(teams, team.id)
        }));
    
    // Fix: Find all nodes in `teams` whose parent is NOT in `teams`. These are the roots of our partial forest.
    if (parentId === null) {
        const teamIds = new Set(teams.map(t => t.id));
        return teams
            .filter(team => !team.parentId || !teamIds.has(team.parentId))
            .map(team => ({
                ...team,
                children: this.buildTree(teams, team.id)
            }));
    }

    return children;
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string) {
    return await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: {
        user: {
            columns: {
                id: true,
                name: true,
                email: true,
                avatar: true
            }
        },
        role: true,
      }
    });
  }

  async isTeamMember(teamId: string, userId: string) {
    const member = await db.query.teamMembers.findFirst({
        where: and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        )
    });
    return !!member;
  }

  /**
   * Add a member to the team
   */
  async addMember(teamId: string, email: string, roleName: string = SYSTEM_ROLES.MEMBER.name) {
    return await db.transaction(async (tx) => {
      // 1. Find User
      const user = await tx.query.users.findFirst({
        where: eq(users.email, email)
      });
      if (!user) throw new Error('User not found');

      // 2. Check if already member
      const existing = await tx.query.teamMembers.findFirst({
        where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      });
      if (existing) throw new Error('User is already a member');

      // 3. Find Role (System or Custom)
      // Priority: Custom Role in Team > System Role
      let role = await tx.query.roles.findFirst({
        where: and(
            eq(roles.name, roleName), 
            eq(roles.teamId, teamId)
        )
      });

      if (!role) {
         // Try System Role
         role = await tx.query.roles.findFirst({
            where: and(
                eq(roles.name, roleName), 
                isNull(roles.teamId)
            )
         });
      }

      if (!role) {
          // Fallback: if 'Member' role missing, create system 'Member' role
          if (roleName === SYSTEM_ROLES.MEMBER.name) {
               [role] = await tx.insert(roles).values({
                ...SYSTEM_ROLES.MEMBER,
                teamId: null,
             } as any).returning();
          } else {
              throw new Error(`Role ${roleName} not found`);
          }
      }

      // 4. Add Member
      const [member] = await tx.insert(teamMembers).values({
        teamId,
        userId: user.id,
        roleId: role!.id,
      }).returning();

      return member;
    });
  }

  /**
   * Check if a user has a specific permission in a team
   */
  async hasPermission(userId: string, teamId: string | null, permission: string): Promise<boolean> {
    if (!teamId) return false;
    
    // 0. Root Check
    if (await this.isRoot(userId)) return true;

    // 1. Check direct membership
    const member = await db.query.teamMembers.findFirst({
        where: and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)),
        with: {
            role: true
        }
    });

    if (member && member.role) {
        const permissions = member.role.permissions as string[];
        if (permissions.includes('*') || permissions.includes(permission)) return true;
    }

    // 2. Check Parent Team (Recursive inheritance for Admins)
    // We assume that if you have permission on a parent, you have it on the child.
    // This implements the "Pyramid" control structure.
    const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
        columns: { parentId: true }
    });

    if (team && team.parentId) {
        return this.hasPermission(userId, team.parentId, permission);
    }
    
    return false;
  }

  /**
   * Remove a member from the team
   */
  async removeMember(operatorId: string, teamId: string, memberId: string) {
    // 1. Check Permission
    const canRemove = await this.hasPermission(operatorId, teamId, 'member:remove');
    
    if (!canRemove) {
        throw new Error('Permission denied');
    }

    // 2. Remove
    await db.delete(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, memberId)
        ));
  }

  /**
   * Move a member to another team (Root only)
   */
  async moveMember(operatorId: string, userId: string, sourceTeamId: string, targetTeamId: string) {
      // 1. Check Root
      const isRoot = await this.isRoot(operatorId);
      if (!isRoot) throw new Error('Only root can move members');

      if (sourceTeamId === targetTeamId) return;

      return await db.transaction(async (tx) => {
          // 2. Remove from source
          await tx.delete(teamMembers)
            .where(and(
                eq(teamMembers.teamId, sourceTeamId),
                eq(teamMembers.userId, userId)
            ));
          
          // 3. Add to target
          // Check if already there
          const existing = await tx.query.teamMembers.findFirst({
              where: and(eq(teamMembers.teamId, targetTeamId), eq(teamMembers.userId, userId))
          });

          if (!existing) {
              // Find Member Role for target team
              const role = await tx.query.roles.findFirst({
                  where: and(eq(roles.name, SYSTEM_ROLES.MEMBER.name), isNull(roles.teamId))
              });
              
              if (role) {
                  await tx.insert(teamMembers).values({
                      teamId: targetTeamId,
                      userId: userId,
                      roleId: role.id
                  } as any);
              }
          }
      });
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(teamId: string, userId: string, roleId: string) {
      // Validate Role exists and belongs to team (or is system)
      const role = await db.query.roles.findFirst({
          where: eq(roles.id, roleId)
      });
      
      if (!role) throw new Error('Role not found');
      if (role.teamId && role.teamId !== teamId) throw new Error('Role does not belong to this team');

      // Update
      await db.update(teamMembers)
          .set({ roleId })
          .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
      
      return true;
  }
}

export const teamService = new TeamService();
