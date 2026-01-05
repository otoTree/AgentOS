import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Input } from '@agentos/web/components/ui/input';
import { Textarea } from '@agentos/web/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agentos/web/components/ui/tabs';
import { Card, CardContent } from '@agentos/web/components/ui/card';
import { Label } from '@agentos/web/components/ui/label';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@agentos/web/components/ui/dialog';
import { Loader2, Save, Play, FileCode, ArrowLeft, Edit2, Box, Rocket, Wand2, Trash2 } from 'lucide-react';
import { toast } from '@agentos/web/components/ui/sonner';
import { FileTree } from '@/components/workbench/FileTree';
import { RunSkillDialog } from '@/components/workbench/RunSkillDialog';
import { AIChatInterface } from '@/components/workbench/AIChatInterface';
import { Badge } from '@agentos/web/components/ui/badge';
import { parsePythonEntrypoint, paramsToJsonSchema } from '@agentos/global';

const FileEditor = dynamic(
  () => import('@agentos/web').then((mod) => mod.FileEditor),
  { ssr: false }
);
const FilePreview = dynamic(
  () => import('@agentos/web').then((mod) => mod.FilePreview),
  { ssr: false }
);

type Skill = {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  version: string;
  ossPath: string;
  isPublished: boolean;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  privateDeployedAt?: string;
  publicDeployedAt?: string;
  meta: {
    files: string[];
    entry: string;
    entrypoint?: string; // Keep for legacy if needed during transition
    input_schema?: Record<string, unknown>;
    output_schema?: unknown;
  };
}

export default function SkillWorkbenchPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('code');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  
  // Code Editor State
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  
  // AI Chat State
  const [models, setModels] = useState<{ id: string }[]>([]);

  // Execution State
  const [runOpen, setRunOpen] = useState(false);

  // Metadata Edit State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', emoji: '' });

  // Deploy State
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [userApiKeys, setUserApiKeys] = useState<{ key: string, name: string }[]>([]);

  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const isMedia = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'pdf'].includes(ext || '');
  };

  const isMarkdown = (filename: string) => filename.endsWith('.md');

  // Initial Fetch
  useEffect(() => {
    if (!id) return;
    fetchSkill();
    fetchDependencies();
    fetchModels();
  }, [id]);

  // Auto-scroll chat
  // Removed in favor of AIChatInterface internal scroll

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/admin/models');
      const data = await res.json();
      const allModels = data.flatMap((p: { models: unknown[] }) => p.models);
      setModels(allModels);
    } catch (err) {
      console.error('Failed to fetch models', err);
    }
  };

  const fetchDependencies = async () => {
    try {
      setLoadingDeps(true);
      const res = await fetch('/api/workbench/env/dependencies');
      const data = await res.json();
      setDependencies(data.dependencies || []);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    } finally {
      setLoadingDeps(false);
    }
  };

  const fetchSkill = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workbench/skills/${id}`);
      if (!res.ok) throw new Error('Failed to load skill');
      const data = await res.json();
      setSkill(data);
      setEditForm({ name: data.name, description: data.description || '', emoji: data.emoji || '🤖' });
      
      // Select entry by default
      if (data.meta?.entry) {
        selectFile(data.meta.entry);
      } else if (data.meta?.files?.length > 0) {
        selectFile(data.meta.files[0]);
      }
    } catch {
      toast.error('Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  // File Management
  const selectFile = async (filename: string) => {
    // If unsaved changes? (Skip for MVP, or add warning)
    setSelectedFile(filename);
    setLoadingFile(true);
    try {
      const res = await fetch(`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error('Failed to load file');
      const data = await res.json();
      setFileContent(data.content);
      setOriginalContent(data.content);
    } catch {
      toast.error(`Failed to load ${filename}`);
      setFileContent('');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCreateFile = async (type: 'file' | 'folder', path: string) => {
    try {
      setLoadingFile(true);
      const filePath = type === 'folder' ? `${path}/.keep` : path;
      
      const res = await fetch(`/api/workbench/skills/${id}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: { [filePath]: '' }
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      
      // Update local state
      const updatedMeta = await res.json();
      setSkill(prev => prev ? { ...prev, meta: { ...prev.meta, files: updatedMeta.files } } : null);
      
      if (type === 'file') selectFile(path);
      toast.success(`${type === 'folder' ? 'Folder' : 'File'} created`);
    } catch {
      toast.error('Failed to create');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    try {
        setLoadingFile(true);
        // Find all files to delete (if folder)
        const filesToDelete = skill?.meta.files.filter(f => f === path || f.startsWith(path + '/')) || [];
        
        for (const file of filesToDelete) {
             await fetch(`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(file)}`, {
                method: 'DELETE',
            });
        }
        
        // Refresh skill to get latest meta
        fetchSkill(); 
        toast.success('Deleted');
        if (selectedFile === path || selectedFile.startsWith(path + '/')) {
            setSelectedFile('');
            setFileContent('');
        }
    } catch {
        toast.error('Delete failed');
    } finally {
        setLoadingFile(false);
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
     try {
        setLoadingFile(true);
        const filesToRename = skill?.meta.files.filter(f => f === oldPath || f.startsWith(oldPath + '/')) || [];
        
        for (const file of filesToRename) {
            // 1. Get Content
            const resContent = await fetch(`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(file)}`);
            if (!resContent.ok) continue;
            const { content } = await resContent.json();
            
            // 2. Calculate new path
            const suffix = file.substring(oldPath.length);
            const targetPath = newPath + suffix;
            
            // 3. Create New
             await fetch(`/api/workbench/skills/${id}/files`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  files: { [targetPath]: content }
                })
              });
              
            // 4. Delete Old
             await fetch(`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(file)}`, {
                method: 'DELETE',
            });
        }
        
        fetchSkill();
        toast.success('Renamed');
     } catch {
        toast.error('Rename failed');
     } finally {
        setLoadingFile(false);
     }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !skill) return;
    setSavingFile(true);
    try {
      let metaUpdates = {};
      
      // Auto-extract params if entry
      if (skill.meta?.entry && selectedFile === skill.meta.entry) {
         try {
             const params = parsePythonEntrypoint(fileContent);
             // Always update schema, even if empty (to clear it if params removed)
             const schema = paramsToJsonSchema(params);
             metaUpdates = { input_schema: schema };
         } catch (e) {
             console.warn('Failed to parse entry params', e);
             toast.warning('Failed to parse entry params');
         }
      }

      const res = await fetch(`/api/workbench/skills/${id}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: {
            [selectedFile]: fileContent
          },
          metaUpdates: Object.keys(metaUpdates).length > 0 ? metaUpdates : undefined
        })
      });
      if (!res.ok) throw new Error('Failed to save file');
      
      const updatedMeta = await res.json();
      if (updatedMeta) {
          setSkill(prev => prev ? { ...prev, meta: updatedMeta } : null);
      }

      setOriginalContent(fileContent);
      toast.success('File saved');
    } catch {
      toast.error('Failed to save file');
    } finally {
      setSavingFile(false);
    }
  };

  // Metadata Update
  const handleUpdateMeta = async () => {
    try {
      const res = await fetch(`/api/workbench/skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Failed to update skill');
      await res.json();
      setSkill(prev => prev ? { ...prev, ...editForm } : null);
      setEditOpen(false);
      toast.success('Skill updated');
    } catch {
      toast.error('Update failed');
    }
  };

  // Delete Skill
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this skill? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/workbench/skills/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete skill');
      toast.success('Skill deleted');
      router.push('/workbench');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCodeUpdate = (filename: string, code: string) => {
    // Refresh current file if it's the one AI updated
    if (selectedFile === filename) {
        setFileContent(code);
        setOriginalContent(code);
    }
  };

  // Execution
  const handleExecute = async (input: Record<string, unknown>) => {
    const res = await fetch(`/api/workbench/skills/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Execution failed');
    }
    
    return await res.json();
  };

  const handleDeploy = async () => {
    if (hasUnsavedChanges) {
      await handleSaveFile();
    }
    setDeployOpen(true);
    fetchApiKeys();
  };

  const fetchApiKeys = async () => {
      try {
          const res = await fetch('/api/user/api-keys');
          if (res.ok) {
              const data = await res.json();
              setUserApiKeys(data);
          }
      } catch (e) {
          console.error('Failed to fetch api keys', e);
      }
  };

  const handleCreateApiKey = async () => {
      try {
          const res = await fetch('/api/user/api-keys', { method: 'POST' });
          if (res.ok) {
              const newKey = await res.json();
              setUserApiKeys(prev => [newKey, ...prev]);
              toast.success('API Key created');
          }
      } catch {
          toast.error('Failed to create API Key');
      }
  };

  const handleDeployAction = async (type: 'private' | 'public') => {
      setDeploying(true);
      try {
          const res = await fetch(`/api/workbench/skills/${id}/deploy`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type })
          });
          if (!res.ok) throw new Error('Deploy failed');
          
          const updated = await res.json();
          setSkill(prev => prev ? { ...prev, ...updated } : null);
          toast.success(`Deployed to ${type} environment`);
      } catch (e: unknown) {
          console.error(e);
          const message = e instanceof Error ? e.message : 'Deployment failed';
          toast.error(`Deployment failed: ${message}`);
      } finally {
          setDeploying(false);
      }
  };

  const handleQuickRun = async () => {
    // Check private deployment
    if (skill && !skill.privateDeployedAt) {
        toast.error('Please deploy to Private environment first');
        setDeployOpen(true);
        fetchApiKeys();
        return;
    }
    setRunOpen(true);
  };

  if (loading || !skill) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const hasUnsavedChanges = fileContent !== originalContent;

  return (
    <AdminLayout mainClassName="overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => router.push('/workbench')}>
            <ArrowLeft className="w-4 h-4" /> Back to Workbench
        </div>
        
        <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-4">
                <div className="text-4xl">{skill.emoji || '🤖'}</div>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {skill.name}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditOpen(true)}>
                            <Edit2 className="w-3 h-3" />
                        </Button>
                    </h1>
                    <p className="text-muted-foreground">{skill.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="outline" onClick={handleQuickRun}>
                    <Play className="w-4 h-4 mr-2" />
                    Run
                </Button>
                <Button onClick={handleDeploy}>
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy
                </Button>
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-[500px] overflow-hidden">
        <div className="flex-shrink-0 mb-4">
          <TabsList className="w-fit">
            <TabsTrigger value="code" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" /> Code
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> AI Assistant
            </TabsTrigger>
            <TabsTrigger value="deps" className="flex items-center gap-2">
              <Box className="w-4 h-4" /> Dependencies
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Deploy Dialog */}
        <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Deploy Skill</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Deployment Environment</Label>
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => handleDeployAction('private')} disabled={deploying}>
                                {deploying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                                Private
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => handleDeployAction('public')} disabled={deploying}>
                                {deploying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                                Public
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>API Keys</Label>
                            <Button variant="ghost" size="sm" onClick={handleCreateApiKey} className="h-6 text-xs">
                                + Create New
                            </Button>
                        </div>
                        <ScrollArea className="h-32 rounded-md border p-2">
                            {userApiKeys.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No API keys found</p>
                            ) : (
                                <div className="space-y-2">
                                    {userApiKeys.map((key) => (
                                        <div key={key.key} className="flex flex-col gap-1">
                                            <span className="text-xs font-medium">{key.name}</span>
                                            <code className="text-[10px] bg-muted p-1 rounded break-all">{key.key}</code>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Run Dialog */}
        <RunSkillDialog
            open={runOpen}
            onOpenChange={setRunOpen}
            skillId={id as string}
            skillName={skill.name}
            entry={skill.meta?.entry}
            code={selectedFile === skill.meta?.entry ? fileContent : undefined}
            onRun={handleExecute}
        />


        {/* Code Tab */}
        <TabsContent value="code" forceMount={true} className="flex-1 flex gap-4  mt-0 data-[state=inactive]:hidden">
            {/* Sidebar */}
            <Card className="w-64 flex flex-col h-full border-r rounded-none border-0">
                <div className="p-3 bg-muted/30 font-medium text-sm border-b flex justify-between items-center">
                    Files
                    {/* Add File Button could go here */}
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2">
                         <FileTree 
                            files={skill.meta?.files || []} 
                            selectedFile={selectedFile} 
                            onSelect={selectFile}
                            onCreate={handleCreateFile}
                            onDelete={handleDeleteFile}
                            onRename={handleRenameFile}
                        />
                    </div>
                </ScrollArea>
            </Card>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col h-full bg-card border rounded-md ">
                <div className=" h-auto py-2 border-b flex items-center justify-between px-4 bg-muted/10">
                    <span className="text-sm font-medium text-muted-foreground">{selectedFile}</span>
                    <div className="flex items-center gap-2">
                         {isMarkdown(selectedFile) && (
                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'edit' | 'preview')} className="mr-2">
                                <TabsList className="h-8">
                                    <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
                                    <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                         {hasUnsavedChanges && <span className="text-xs text-yellow-600 mr-2">Unsaved changes</span>}
                         <Button size="sm" onClick={handleSaveFile} disabled={savingFile || !hasUnsavedChanges}>
                            {savingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                            Save
                         </Button>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    {loadingFile ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        selectedFile && isMedia(selectedFile) ? (
                             <FilePreview 
                                name={selectedFile}
                                url={`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(selectedFile)}&raw=true`}
                                className="h-full w-full"
                            />
                        ) : (
                             viewMode === 'preview' && isMarkdown(selectedFile) ? (
                                <FilePreview 
                                    name={selectedFile} 
                                    content={fileContent} 
                                    className="h-full w-full"
                                />
                             ) : (
                                <FileEditor
                                    content={fileContent}
                                    fileName={selectedFile}
                                    onChange={(value) => setFileContent(value || '')}
                                    className="h-full w-full"
                                />
                             )
                        )
                    )}
                </div>
            </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden min-h-0">
             <AIChatInterface 
                skillId={id as string} 
                models={models} 
                onCodeUpdate={handleCodeUpdate}
                selectedFile={selectedFile}
             />
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="deps" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden min-h-0 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="flex-1 flex flex-col p-6 min-h-0">
                    <div className="flex-none">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Available Environment Dependencies</h3>
                            <Badge variant="outline">{dependencies.length} Packages</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            These are the pre-installed Python packages available in the sandbox environment. 
                            You can import these in your skill code. New dependencies must be requested from the administrator.
                        </p>
                    </div>
                    
                    <div className="flex-1 min-h-0 relative">
                        <ScrollArea className="h-full">
                            {loadingDeps ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                                    {dependencies.map((dep, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                                            <Box className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">{dep}</span>
                                        </div>
                                    ))}
                                    {dependencies.length === 0 && (
                                        <div className="col-span-full text-center py-10 text-muted-foreground">
                                            No dependencies found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Skill Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label>Emoji</Label>
                    <Input className="w-16 text-center text-xl" value={editForm.emoji} onChange={e => setEditForm({...editForm, emoji: e.target.value})} />
                </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
                <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Skill
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateMeta}>Save Changes</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
