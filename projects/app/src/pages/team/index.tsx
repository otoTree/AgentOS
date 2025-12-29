import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@agentos/web/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agentos/web/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@agentos/web/components/ui/dialog';
import { RolesTab } from '../../components/team/RolesTab';
import { UserPlus, Plus, ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@agentos/web/components/ui/input';

type Team = {
  id: string;
  name: string;
  parentId?: string | null;
  children?: Team[];
}

type Role = {
    id: string;
    name: string;
    teamId: string | null;
}

type Member = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
  };
  joinedAt: string;
}

const flattenTeams = (nodes: Team[], depth = 0): { id: string, name: string, depth: number }[] => {
    let result: { id: string, name: string, depth: number }[] = [];
    for (const node of nodes) {
        result.push({ id: node.id, name: node.name, depth });
        if (node.children) {
            result = result.concat(flattenTeams(node.children, depth + 1));
        }
    }
    return result;
}

const TeamTree = ({ nodes, selectedId, onSelect, level = 0 }: { nodes: Team[], selectedId: string | null, onSelect: (id: string) => void, level?: number }) => {
    return (
        <div className="space-y-1">
            {nodes.map((node) => (
                <TeamTreeItem 
                    key={node.id} 
                    node={node} 
                    selectedId={selectedId} 
                    onSelect={onSelect} 
                    level={level} 
                />
            ))}
        </div>
    );
}

const TeamTreeItem = ({ node, selectedId, onSelect, level = 0 }: { node: Team, selectedId: string | null, onSelect: (id: string) => void, level: number }) => {
    const [expanded, setExpanded] = useState(true);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div 
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors ${isSelected ? 'bg-slate-200 font-medium text-slate-900' : 'text-slate-600'}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                <div 
                    className="mr-1 p-0.5 hover:bg-slate-300 rounded cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                >
                    {hasChildren ? (
                        expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    ) : <span className="w-3 h-3 inline-block" />}
                </div>
                {isSelected ? <FolderOpen className="w-4 h-4 mr-2 text-blue-600" /> : <Folder className="w-4 h-4 mr-2 text-blue-400" />}
                <span className="truncate text-sm">{node.name}</span>
            </div>
            {expanded && hasChildren && (
                <TeamTree nodes={node.children!} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
            )}
        </div>
    )
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isRoot, setIsRoot] = useState(false);

  // Move Member State
  const [memberToMove, setMemberToMove] = useState<Member | null>(null);
  const [targetTeamId, setTargetTeamId] = useState<string>('');

  const loadTeams = () => {
    fetch('/api/team?tree=true')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        if (data.length > 0 && !selectedTeam) setSelectedTeam(data[0].id);
      });
  };

  // Load User Status
  useEffect(() => {
      fetch('/api/user/status')
        .then(res => res.json())
        .then(data => setIsRoot(!!data.isRoot))
        .catch(() => setIsRoot(false));
  }, []);

  // Load Teams
  useEffect(() => {
    loadTeams();
  }, []);

  // Load Team Data (Members)
  useEffect(() => {
    if (!selectedTeam) return;

    fetch(`/api/team/${selectedTeam}/members`)
      .then(res => res.json())
      .then(setMembers);

    // Load Roles
    fetch(`/api/rbac/roles?teamId=${selectedTeam}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableRoles(data);
        });
  }, [selectedTeam]);

  const handleUpdateRole = async (userId: string, roleId: string) => {
      if (!selectedTeam) return;
      try {
          const res = await fetch(`/api/team/${selectedTeam}/members`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, roleId })
          });
          if (res.ok) {
              // Refresh members
              fetch(`/api/team/${selectedTeam}/members`)
                .then(r => r.json())
                .then(setMembers);
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to update role');
          }
      } catch {
          alert('Failed to update role');
      }
  };

  const handleRemoveMember = async (userId: string) => {
      if (!selectedTeam || !confirm('Are you sure you want to remove this member?')) return;
      
      try {
          const res = await fetch(`/api/team/${selectedTeam}/members`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId })
          });
          if (res.ok) {
              setMembers(members.filter(m => m.user.id !== userId));
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to remove member');
          }
      } catch {
          alert('Failed to remove member');
      }
  };

  const handleMoveMember = async () => {
      if (!selectedTeam || !memberToMove || !targetTeamId) return;

      try {
          const res = await fetch(`/api/team/${selectedTeam}/members`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  action: 'move', 
                  userId: memberToMove.user.id, 
                  targetTeamId 
              })
          });

          if (res.ok) {
              setMembers(members.filter(m => m.user.id !== memberToMove.user.id));
              setMemberToMove(null);
              setTargetTeamId('');
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to move member');
          }
      } catch {
          alert('Failed to move member');
      }
  };

  const handleCreateTeam = async () => {
      if (!newTeamName.trim()) return;
      
      const parentId = selectedTeam; // Create sub-team under selected
      
      try {
        const res = await fetch('/api/team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newTeamName, parentId })
        });
        
        if (res.ok) {
            setNewTeamName('');
            setIsCreating(false);
            loadTeams();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to create team');
        }
      } catch {
          alert('Error creating team');
      }
  };

  return (
    <AdminLayout>
      <div className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Sidebar: Team Tree */}
        <Card className="w-72 flex-shrink-0 flex flex-col">
          <CardHeader className="py-4 px-4 border-b">
            <div className="flex justify-between items-center">
                <CardTitle className="text-base">Organization</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setSelectedTeam(null); // Deselect to create root team? Or just logic to create root
                    setIsCreating(true); 
                }}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto py-4 px-2">
            <TeamTree nodes={teams} selectedId={selectedTeam} onSelect={setSelectedTeam} />
            
            {teams.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-4">No teams found</div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="flex-1 overflow-hidden flex flex-col">
            {selectedTeam ? (
                <div className="flex flex-col h-full p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-semibold text-xl mb-1">
                                {(() => {
                                    // Helper to find team name in tree
                                    const findName = (nodes: Team[]): string => {
                                        for (const node of nodes) {
                                            if (node.id === selectedTeam) return node.name;
                                            if (node.children) {
                                                const found = findName(node.children);
                                                if (found) return found;
                                            }
                                        }
                                        return '';
                                    }
                                    return findName(teams);
                                })()}
                            </h3>
                            <p className="text-sm text-muted-foreground">Manage members and settings</p>
                        </div>
                    </div>

                    <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 mb-4">
                            <TabsList className="w-fit">
                                <TabsTrigger value="members">Members & Departments</TabsTrigger>
                                <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="members" className="flex-1 data-[state=active]:flex flex-col overflow-hidden mt-0">
                            <div className="flex justify-end gap-2 mb-4">
                                <Button variant="outline" onClick={() => setIsCreating(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Sub-Department
                                </Button>
                                <Button variant="default"><UserPlus className="w-4 h-4 mr-2" /> Invite Member</Button>
                            </div>

                            {isCreating && (
                                <div className="mb-6 p-4 border rounded-lg bg-slate-50">
                                    <h4 className="font-medium mb-2 text-sm">Create New Department</h4>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="Department Name" 
                                            value={newTeamName} 
                                            onChange={(e) => setNewTeamName(e.target.value)} 
                                        />
                                        <Button onClick={handleCreateTeam}>Create</Button>
                                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map(member => (
                                            <TableRow key={member.id}>
                                                <TableCell className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                        {member.user.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{member.user.name}</div>
                                                        <div className="text-xs text-muted-foreground">{member.user.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select 
                                                        defaultValue={member.role?.id} 
                                                        onValueChange={(val) => handleUpdateRole(member.user.id, val)}
                                                    >
                                                        <SelectTrigger className="h-7 w-[140px]">
                                                            <SelectValue placeholder={member.role?.name} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableRoles.map(role => (
                                                                <SelectItem key={role.id} value={role.id}>
                                                                    {role.name}
                                                                    {role.teamId === null && (
                                                                        <span className="ml-2 text-xs text-muted-foreground">(System)</span>
                                                                    )}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>{format(new Date(member.joinedAt || Date.now()), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {isRoot && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                                                onClick={() => setMemberToMove(member)}
                                                                title="Move to another team"
                                                            >
                                                                <ArrowRightLeft className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleRemoveMember(member.user.id)}
                                                            title="Remove from team"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {members.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                    No members in this department
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="roles" className="flex-1 overflow-auto mt-0">
                            <RolesTab teamId={selectedTeam} />
                        </TabsContent>
                    </Tabs>

                    {/* Move Member Dialog */}
                    <Dialog open={!!memberToMove} onOpenChange={(open) => !open && setMemberToMove(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Move Member</DialogTitle>
                                <DialogDescription>
                                    Move <b>{memberToMove?.user.name}</b> to another department. 
                                    They will be removed from the current department.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <label className="text-sm font-medium mb-2 block">Target Department</label>
                                <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {flattenTeams(teams).map(t => (
                                            <SelectItem 
                                                key={t.id} 
                                                value={t.id}
                                                disabled={t.id === selectedTeam}
                                            >
                                                <span style={{ paddingLeft: `${t.depth * 10}px` }}>{t.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setMemberToMove(null)}>Cancel</Button>
                                <Button onClick={handleMoveMember} disabled={!targetTeamId}>Move</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <p className="mb-4">Select a department to manage</p>
                     <Button variant="outline" onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Root Department
                     </Button>
                     
                     {isCreating && (
                        <div className="mt-6 p-4 border rounded-lg bg-slate-50 w-96">
                            <h4 className="font-medium mb-2 text-sm">Create New Department</h4>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Department Name" 
                                    value={newTeamName} 
                                    onChange={(e) => setNewTeamName(e.target.value)} 
                                />
                                <Button onClick={handleCreateTeam}>Create</Button>
                                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
      </div>
    </AdminLayout>
  );
}
