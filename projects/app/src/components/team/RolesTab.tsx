import React, { useState, useEffect } from 'react';
import { Button } from '@agentos/web/components/ui/button';
import { Checkbox } from '@agentos/web/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@agentos/web/components/ui/input';
import { Badge } from '@agentos/web/components/ui/badge';

// Types (should probably be shared)
type Role = {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    teamId: string | null; // null = system role
};

type Props = {
    teamId: string;
};

export function RolesTab({ teamId }: Props) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isRoot, setIsRoot] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Create Role State
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');

    useEffect(() => {
        loadData();
    }, [teamId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsData] = await Promise.all([
                fetch(`/api/rbac/roles?teamId=${teamId}`).then(r => r.json()),
                fetch(`/api/rbac/permissions`).then(r => r.json())
            ]);
            setRoles(Array.isArray(rolesRes) ? rolesRes : []);
            setPermissions(Array.isArray(permsData.permissions) ? permsData.permissions : []);
            setIsRoot(!!permsData.isRoot);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = async (role: Role, perm: string, checked: boolean) => {
        // Optimistic update
        const newPerms = checked 
            ? [...role.permissions, perm]
            : role.permissions.filter(p => p !== perm);
            
        const updatedRole = { ...role, permissions: newPerms };
        setRoles(roles.map(r => r.id === role.id ? updatedRole : r));

        try {
            await fetch(`/api/rbac/roles/${role.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: newPerms })
            });
        } catch {
            // Revert on error
            setRoles(roles.map(r => r.id === role.id ? role : r));
            alert('Failed to update permission');
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName) return;
        try {
            const res = await fetch('/api/rbac/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId,
                    name: newRoleName,
                    description: newRoleDesc,
                    permissions: [] 
                })
            });
            if (res.ok) {
                setIsCreating(false);
                setNewRoleName('');
                setNewRoleDesc('');
                loadData();
            }
        } catch {
            alert('Failed to create role');
        }
    };
    
    const handleDeleteRole = async (roleId: string) => {
        if (!confirm('Are you sure? This will fail if users are assigned to this role.')) return;
        try {
            const res = await fetch(`/api/rbac/roles/${roleId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                loadData();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch {
            alert('Failed to delete role');
        }
    };

    // Group permissions
    const safePermissions = Array.isArray(permissions) ? permissions : [];
    const groupedPerms = safePermissions.reduce((acc, perm) => {
        const [resource] = perm.split(':');
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(perm);
        return acc;
    }, {} as Record<string, string[]>);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Configure roles and their permissions for this team.
                </div>
                {!isCreating ? (
                    <Button size="sm" onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Role
                    </Button>
                ) : (
                    <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                        <Input 
                            placeholder="Role Name" 
                            value={newRoleName} 
                            onChange={e => setNewRoleName(e.target.value)} 
                            className="h-8 w-32"
                        />
                        <Input 
                            placeholder="Description" 
                            value={newRoleDesc} 
                            onChange={e => setNewRoleDesc(e.target.value)} 
                            className="h-8 w-48"
                        />
                        <Button size="sm" onClick={handleCreateRole}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                    </div>
                )}
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Permission</TableHead>
                            {roles.map(role => (
                                <TableHead key={role.id} className="text-center min-w-[100px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1">
                                            {role.name}
                                            {role.teamId === null && (
                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">System</Badge>
                                            )}
                                        </div>
                                        {role.teamId && (
                                            <Trash2 
                                                className="w-3 h-3 text-red-300 hover:text-red-500 cursor-pointer" 
                                                onClick={() => handleDeleteRole(role.id)}
                                            />
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(groupedPerms).map(([resource, perms]) => (
                            <React.Fragment key={resource}>
                                <TableRow className="bg-slate-50">
                                    <TableCell colSpan={roles.length + 1} className="font-semibold text-xs py-2 uppercase tracking-wider text-slate-500">
                                        {resource} Management
                                    </TableCell>
                                </TableRow>
                                {perms.map(perm => (
                                    <TableRow key={perm}>
                                        <TableCell className="py-2 text-sm font-medium">
                                            {perm}
                                        </TableCell>
                                        {roles.map(role => {
                                            const isSystem = role.teamId === null;
                                            const hasPerm = role.permissions.includes('*') || role.permissions.includes(perm);
                                            
                                            const disabled = isSystem && !isRoot; 
                                            
                                            return (
                                                <TableCell key={role.id} className="text-center py-2">
                                                    <div className="flex justify-center">
                                                        <Checkbox 
                                                            checked={hasPerm} 
                                                            onCheckedChange={(checked) => handlePermissionChange(role, perm, !!checked)}
                                                            disabled={disabled}
                                                        />
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
