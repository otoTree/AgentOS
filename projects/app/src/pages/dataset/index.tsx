import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@agentos/web/components/ui/card';
import { Input } from '@agentos/web/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@agentos/web/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@agentos/web/components/ui/dialog';
import { Label } from '@agentos/web/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Upload, Trash2, FileIcon, Folder, FolderPlus, Share2, ArrowLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@agentos/web/components/ui/dropdown-menu';
import { format } from 'date-fns';

type Team = {
  id: string;
  name: string;
}

type FileData = {
  id: string;
  name: string;
  url: string;
  size: number;
  uploader?: {
    name: string;
  };
  createdAt: string;
  isShared?: boolean;
}

type FolderData = {
  id: string;
  name: string;
  owner: {
    name: string;
  };
  createdAt: string;
}

type Dataset = {
  folders: FolderData[];
  files: FileData[];
}

export default function DatasetPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset>({ folders: [], files: [] });
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  
  // Navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<{id: string, name: string}[]>([]);

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<string | null>(null);
  const [shareTeamId, setShareTeamId] = useState<string>("");

  // Load Teams
  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        if (data.length > 0 && activeTab === 'team') setSelectedTeam(data[0].id);
      });
  }, []);

  // Reset navigation when switching tabs or teams
  useEffect(() => {
      setCurrentFolderId(null);
      setPath([]);
  }, [activeTab, selectedTeam]);

  // Load Dataset
  const loadDataset = () => {
    let url = `/api/dataset/list?source=${activeTab}`;
    if (activeTab === 'team') {
        if (!selectedTeam) return;
        url += `&teamId=${selectedTeam}`;
    }
    if (currentFolderId) {
        url += `&parentId=${currentFolderId}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => setDataset(data))
      .catch(console.error);
  };

  useEffect(() => {
      loadDataset();
  }, [activeTab, selectedTeam, currentFolderId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (activeTab === 'team' && !selectedTeam) return;
    
    setUploading(true);

    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    if (activeTab === 'team' && selectedTeam) {
        formData.append('teamId', selectedTeam);
    }
    if (currentFolderId) {
        formData.append('folderId', currentFolderId);
    }

    try {
        const res = await fetch('/api/dataset/upload', {
            method: 'POST',
            body: formData,
        });
        if (res.ok) {
            loadDataset();
        } else {
            const err = await res.json();
            alert(`Upload failed: ${err.error}`);
        }
    } catch {
        alert('Upload failed');
    } finally {
        setUploading(false);
        // Clear input
        e.target.value = '';
    }
  };

  const createFolder = async () => {
      if (!newFolderName) return;
      try {
          const res = await fetch('/api/dataset/folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name: newFolderName,
                  parentId: currentFolderId,
                  teamId: activeTab === 'team' ? selectedTeam : undefined
              })
          });
          if (res.ok) {
              setCreateFolderOpen(false);
              setNewFolderName("");
              loadDataset();
          } else {
              alert('Failed to create folder');
          }
      } catch {
          alert('Error creating folder');
      }
  };

  const deleteFolder = async (id: string) => {
      if (!confirm('Are you sure? This will delete all files inside.')) return;
      try {
          const res = await fetch(`/api/dataset/folder?id=${id}`, { method: 'DELETE' });
          if (res.ok) loadDataset();
          else {
               const err = await res.json();
               alert(err.error || 'Failed');
          }
      } catch { alert('Error'); }
  };
  
  const handleDeleteFile = async (id: string) => {
      if (!confirm('Are you sure?')) return;
      try {
          const res = await fetch(`/api/dataset/file?id=${id}`, { method: 'DELETE' });
          if (res.ok) loadDataset();
          else {
              const err = await res.json();
              alert(err.error || 'Failed to delete');
          }
      } catch { alert('Error'); }
  };
  
  const shareFile = async () => {
      if (!selectedFileForShare || !shareTeamId) return;
      try {
          const res = await fetch('/api/dataset/permission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  fileId: selectedFileForShare,
                  teamId: shareTeamId,
                  permission: 'read' 
              })
          });
          if (res.ok) {
              setShareOpen(false);
              alert('Shared successfully');
          } else {
              const err = await res.json();
              alert(err.error);
          }
      } catch { alert('Error'); }
  };

  const enterFolder = (folder: FolderData) => {
      setPath([...path, { id: folder.id, name: folder.name }]);
      setCurrentFolderId(folder.id);
  };

  const navigateUp = (index: number) => {
      if (index === -1) {
          setPath([]);
          setCurrentFolderId(null);
      } else {
          const newPath = path.slice(0, index + 1);
          setPath(newPath);
          setCurrentFolderId(newPath[newPath.length - 1].id);
      }
  };

  return (
    <AdminLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-none mb-4">
             <TabsList>
                <TabsTrigger value="personal">Personal Space</TabsTrigger>
                <TabsTrigger value="team">Team Space</TabsTrigger>
            </TabsList>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Sidebar: Team List */}
            {activeTab === 'team' && (
                <Card className="w-64 flex-shrink-0 flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg">Teams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 flex-1 overflow-auto">
                    {teams.map(team => (
                    <Button 
                        key={team.id} 
                        variant={selectedTeam === team.id ? "default" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => setSelectedTeam(team.id)}
                    >
                        {team.name}
                    </Button>
                    ))}
                </CardContent>
                </Card>
            )}

            {/* Main Content */}
            <Card className="flex-1 overflow-hidden flex flex-col">
                {(activeTab === 'personal' || selectedTeam) ? (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b flex justify-between items-center flex-none">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => navigateUp(path.length - 2)} disabled={path.length === 0}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center text-sm font-medium">
                                    <span 
                                        className="hover:underline cursor-pointer" 
                                        onClick={() => navigateUp(-1)}
                                    >
                                        Root
                                    </span>
                                    {path.map((p, i) => (
                                        <React.Fragment key={p.id}>
                                            <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
                                            <span 
                                                className={`hover:underline cursor-pointer ${i === path.length - 1 ? 'text-foreground' : 'text-muted-foreground'}`}
                                                onClick={() => navigateUp(i)}
                                            >
                                                {p.name}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <FolderPlus className="w-4 h-4 mr-2" />
                                            New Folder
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create Folder</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Label>Folder Name</Label>
                                            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="My Folder" />
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={createFolder}>Create</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={handleUpload}
                                        disabled={uploading}
                                    />
                                    <Button disabled={uploading}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        {uploading ? 'Uploading...' : 'Upload File'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Folders */}
                                    {dataset.folders?.map(folder => (
                                        <TableRow key={folder.id} className="cursor-pointer hover:bg-muted/50" onClick={() => enterFolder(folder)}>
                                            <TableCell><Folder className="w-4 h-4 text-yellow-500 fill-yellow-500" /></TableCell>
                                            <TableCell className="font-medium">{folder.name}</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>{folder.owner?.name}</TableCell>
                                            <TableCell>{format(new Date(folder.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" onClick={() => deleteFolder(folder.id)} className="text-red-500 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Files */}
                                    {dataset.files?.map(file => (
                                        <TableRow key={file.id}>
                                            <TableCell><FileIcon className="w-4 h-4 text-blue-500" /></TableCell>
                                            <TableCell className="font-medium">
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
                                                    {file.name}
                                                    {file.isShared && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Shared</span>}
                                                </a>
                                            </TableCell>
                                            <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                                            <TableCell>{file.uploader?.name}</TableCell>
                                            <TableCell>{format(new Date(file.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedFileForShare(file.id);
                                                            setShareOpen(true);
                                                        }}>
                                                            <Share2 className="w-4 h-4 mr-2" /> Share
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFile(file.id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {(dataset.files?.length || 0) === 0 && (dataset.folders?.length || 0) === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                Empty folder
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        Select a team to manage files
                    </div>
                )}
            </Card>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share File</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Select Team to Share With</Label>
                        <Select onValueChange={setShareTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={shareFile} disabled={!shareTeamId}>Share</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </Tabs>
    </AdminLayout>
  );
}