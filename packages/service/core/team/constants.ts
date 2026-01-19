// Define all available permissions in the system
export const PERMISSIONS = {
    // Team
    TEAM_READ: 'team:read',
    TEAM_UPDATE: 'team:update',
    TEAM_DELETE: 'team:delete',
    
    // Members
    MEMBER_READ: 'member:read',
    MEMBER_ADD: 'member:add',
    MEMBER_REMOVE: 'member:remove',
    MEMBER_UPDATE: 'member:update',
    
    // Models
    MODEL_READ: 'model:read',
    MODEL_CREATE: 'model:create',
    MODEL_UPDATE: 'model:update',
    MODEL_DELETE: 'model:delete',
    
    // Files
    FILE_READ: 'file:read',
    FILE_UPLOAD: 'file:upload',
    FILE_DELETE: 'file:delete',

    // Skills
    SKILL_READ: 'skill:read',
    SKILL_CREATE: 'skill:create',
    SKILL_UPDATE: 'skill:update',
    SKILL_DELETE: 'skill:delete',
    SKILL_RUN: 'skill:run',
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// System Default Roles Definition
export const SYSTEM_ROLES = {
    OWNER: {
        name: 'Owner',
        description: 'Team Owner with full access',
        permissions: ['*']
    },
    ADMIN: {
        name: 'Admin',
        description: 'Team Administrator',
        permissions: [
            PERMISSIONS.TEAM_READ,
            PERMISSIONS.TEAM_UPDATE,
            PERMISSIONS.MEMBER_READ,
            PERMISSIONS.MEMBER_ADD,
            PERMISSIONS.MEMBER_REMOVE,
            PERMISSIONS.MODEL_READ,
            PERMISSIONS.MODEL_CREATE,
            PERMISSIONS.MODEL_UPDATE,
            PERMISSIONS.FILE_READ,
            PERMISSIONS.FILE_UPLOAD,
            PERMISSIONS.FILE_DELETE,
        ]
    },
    MEMBER: {
        name: 'Member',
        description: 'Standard Team Member',
        permissions: [
            PERMISSIONS.TEAM_READ,
            PERMISSIONS.MEMBER_READ,
            PERMISSIONS.MODEL_READ,
            PERMISSIONS.FILE_READ,
            PERMISSIONS.FILE_UPLOAD,
            PERMISSIONS.SKILL_READ,
            PERMISSIONS.SKILL_RUN,
        ]
    }
};
