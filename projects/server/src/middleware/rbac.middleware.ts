import { Request, Response, NextFunction } from 'express';
import { rbacService, skillService, db, skills } from '@agentos/service';
import { eq } from 'drizzle-orm';
import { PERMISSIONS } from '@agentos/service/core/team/constants';

type PermissionExtractor = (req: Request) => Promise<{ teamId: string | null, permission?: string }>;

/**
 * RBAC Middleware Factory
 */
export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Determine Context
      let teamId: string | null = null;
      
      // Case 1: teamId in query (e.g. List Skills)
      if (req.query.teamId) {
        teamId = req.query.teamId as string;
      }
      
      // Case 2: skillId in params (e.g. Run/Get Skill)
      else if (req.params.id) {
        const skillId = req.params.id as string;
        const skill = await db.query.skills.findFirst({
            where: eq(skills.id, skillId)
        });
        
        if (!skill) {
             return res.status(404).json({ error: 'Skill not found' });
        }
        
        // Special Case: Public Skills don't need permission for Read/Run
        // But for Update/Delete they do.
        if (skill.isPublic) {
             if (requiredPermission === PERMISSIONS.SKILL_READ || requiredPermission === PERMISSIONS.SKILL_RUN) {
                 return next();
             }
        }
        
        teamId = skill.teamId;
      }

      if (!teamId) {
         // If no team context is found, and we are listing, maybe it's global list?
         // For now, strict mode: if permission required, need team context.
         // Unless it's a global action.
         return res.status(400).json({ error: 'Team context required' });
      }

      const hasPermission = await rbacService.checkPermission(user.id, teamId, requiredPermission);
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
