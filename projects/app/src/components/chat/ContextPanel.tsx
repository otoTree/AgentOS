import React, { useState, useEffect } from 'react';
import { Button } from '@agentos/web/components/ui/button';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@agentos/web/components/ui/dialog';
import { Input } from '@agentos/web/components/ui/input';
import { Badge } from '@agentos/web/components/ui/badge';
import { 
  Plus, 
  Search, 
  Box, 
  Trash2, 
  Loader2, 
  Globe, 
  Lock 
} from 'lucide-react';
// import { toast } from '@agentos/web/components/ui/sonner';

export type Skill = {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  type: 'public' | 'private';
  owner: string;
};

type ContextPanelProps = {
  activeSkills: Skill[];
  onAddSkill: (skill: Skill) => void;
  onRemoveSkill: (skillId: string) => void;
}

export function ContextPanel({ activeSkills, onAddSkill, onRemoveSkill }: ContextPanelProps) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchSkills();
    }
  }, [open]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/skills');
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(data);
    } catch (error) {
      console.error(error);
      // Assuming toast is available globally or passed down, 
      // but here we use a simple console error or minimal UI feedback
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-muted/10 border-l w-80">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Context</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-2">
              <Plus className="w-3 h-3" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Skill to Context</DialogTitle>
            </DialogHeader>
            <div className="p-1">
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search skills..." 
                  className="border-0 p-0 h-auto focus-visible:ring-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No deployed skills found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSkills.map(skill => {
                      const isActive = activeSkills.some(s => s.id === skill.id);
                      return (
                        <div 
                          key={skill.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted ${isActive ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => {
                            onAddSkill(skill);
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-lg flex-shrink-0">
                            {skill.emoji || '🤖'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-sm truncate">{skill.name}</div>
                                {skill.type === 'public' ? (
                                    <Globe className="w-3 h-3 text-green-500" />
                                ) : (
                                    <Lock className="w-3 h-3 text-orange-500" />
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {skill.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 p-4">
        {activeSkills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>No context items.</p>
            <p className="text-xs mt-1">Add skills to enhance the agent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSkills.map(skill => (
              <div key={skill.id} className="group flex items-start gap-3 p-3 rounded-lg bg-background border shadow-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-lg flex-shrink-0">
                  {skill.emoji || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{skill.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {skill.type}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                  onClick={() => onRemoveSkill(skill.id)}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/5">
        <p className="text-xs text-muted-foreground">
          Skills run in their own sandboxed environment with user permissions.
        </p>
      </div>
    </div>
  );
}
