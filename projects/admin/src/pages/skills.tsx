import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@agentos/web';
import { Loader2, Search, Code2 } from 'lucide-react';

type SkillData = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  version: string;
  isPublished: boolean;
  isPublic: boolean;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  team: {
    id: string;
    name: string;
  };
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/admin/skills');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSkills(data);
      }
    } catch {
      console.error('Failed to fetch skills');
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.owner.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skill Management</h1>
            <p className="text-muted-foreground">
              View all user skills.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search skills or owners..." 
                className="max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No skills found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSkills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-lg">
                              {skill.emoji || <Code2 className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-medium">{skill.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {skill.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={skill.owner.avatar || ''} />
                              <AvatarFallback>{skill.owner.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{skill.owner.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                            {skill.team?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline">{skill.version}</Badge>
                        </TableCell>
                         <TableCell>
                           <div className="flex gap-1">
                                {skill.isPublished && <Badge variant="secondary">Team</Badge>}
                                {skill.isPublic && <Badge>Public</Badge>}
                                {!skill.isPublished && !skill.isPublic && <Badge variant="outline">Private</Badge>}
                           </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(skill.updatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
