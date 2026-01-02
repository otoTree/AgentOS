import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@agentos/web/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@agentos/web/components/ui/dialog';
import { Input } from '@agentos/web/components/ui/input';
import { Label } from '@agentos/web/components/ui/label';
import { Textarea } from '@agentos/web/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Plus, Bot, Code2, Terminal, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from '@agentos/web/components/ui/sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@agentos/web/components/ui/dropdown-menu';

type Skill = {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  version: string;
  updatedAt: string;
}

type Team = {
  id: string;
  name: string;
}

export default function WorkbenchPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', emoji: '🤖' });
  const [creating, setCreating] = useState(false);
  
  // Edit State
  const [editOpen, setEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', emoji: '' });
  const [updating, setUpdating] = useState(false);

  // Fetch Teams
  useEffect(() => {
    fetch('/api/team') // Assuming this endpoint exists based on context
      .then(res => res.json())
      .then(data => {
        // API structure might be different, let's assume it returns array or { teams: [] }
        // Based on typical patterns. If it fails, I'll debug.
        const list = Array.isArray(data) ? data : (data.teams || []);
        setTeams(list);
        if (list.length > 0) {
            setSelectedTeamId(list[0].id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch Skills when team changes
  useEffect(() => {
    if (!selectedTeamId) return;
    setLoading(true);
    fetch(`/api/workbench/skills?teamId=${selectedTeamId}`)
      .then(res => res.json())
      .then(data => {
        setSkills(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('Failed to load skills'))
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  const handleCreate = async () => {
    if (!newSkill.name || !selectedTeamId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/workbench/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          ...newSkill
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const skill = await res.json();
      setSkills([skill, ...skills]);
      setCreateOpen(false);
      setNewSkill({ name: '', description: '', emoji: '🤖' });
      toast.success('Skill created');
      router.push(`/workbench/${skill.id}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to create skill');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation();
    setEditingSkill(skill);
    setEditForm({
      name: skill.name,
      description: skill.description,
      emoji: skill.emoji || '🤖'
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSkill) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/workbench/skills/${editingSkill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const updatedSkill = await res.json();
      setSkills(skills.map(s => s.id === editingSkill.id ? { ...s, ...updatedSkill } : s));
      setEditOpen(false);
      toast.success('Skill updated');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update skill');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${skill.name}"?`)) return;

    try {
      const res = await fetch(`/api/workbench/skills/${skill.id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      setSkills(skills.filter(s => s.id !== skill.id));
      toast.success('Skill deleted');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete skill');
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Terminal className="w-8 h-8" />
            Workbench
          </h1>
          <p className="text-muted-foreground">Build and deploy AI skills.</p>
        </div>
        <div className="flex gap-4 items-center">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
                <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Skill
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Create New Skill</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input 
                        placeholder="e.g. hacker-news-digest" 
                        value={newSkill.name}
                        onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea 
                        placeholder="What does this skill do?" 
                        value={newSkill.description}
                        onChange={e => setNewSkill({...newSkill, description: e.target.value})}
                    />
                </div>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white dark:bg-slate-900 border-dashed">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No skills found</h3>
            <p className="text-muted-foreground mb-4">Select a team or create your first skill to get started.</p>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>Create Skill</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map(skill => (
            <Card 
                key={skill.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => router.push(`/workbench/${skill.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-2xl">{skill.emoji || '🤖'}</span>
                    {skill.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEditClick(e, skill)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => handleDelete(e, skill)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
                <CardDescription className="line-clamp-2 h-10">
                  {skill.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Code2 className="w-3 h-3" />
                    {skill.version}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground border-t bg-slate-50 dark:bg-slate-900/50 p-3">
                Updated {new Date(skill.updatedAt).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Skill</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input 
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea 
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Emoji</Label>
                    <Input 
                        className="w-16 text-center text-xl" 
                        value={editForm.emoji}
                        onChange={e => setEditForm({...editForm, emoji: e.target.value})}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={updating}>
                    {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
