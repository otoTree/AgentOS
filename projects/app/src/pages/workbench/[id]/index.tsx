import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Input } from '@agentos/web/components/ui/input';
import { Textarea } from '@agentos/web/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agentos/web/components/ui/tabs';
import { Card, CardContent } from '@agentos/web/components/ui/card';
import { Label } from '@agentos/web/components/ui/label';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@agentos/web/components/ui/dialog';
import { Loader2, Save, Play, FileCode, ArrowLeft, Edit2, Box, Rocket, Wand2, Terminal, Trash2 } from 'lucide-react';
import { toast } from '@agentos/web/components/ui/sonner';
import Editor from '@monaco-editor/react';
import { FileTree } from '@/components/workbench/FileTree';
import { Badge } from '@agentos/web/components/ui/badge';
import { Switch } from '@agentos/web/components/ui/switch';
import { parsePythonEntrypoint, ParamInfo } from '@/utils/python-parser';
import { AutoForm } from '@/components/workbench/AutoForm';

type Skill = {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  ossPath: string;
  version: string;
  meta: {
    files: string[];
    entrypoint: string;
    input_schema?: unknown;
    output_schema?: unknown;
  };
}

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
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
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [models, setModels] = useState<{ id: string }[]>([]);

  // Execution State
  const [runOpen, setRunOpen] = useState(false);
  const [runInput, setRunInput] = useState('{}');
  const [runResult, setRunResult] = useState<unknown>(null);
  const [running, setRunning] = useState(false);

  // Metadata Edit State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', emoji: '' });

  // Auto Form State
  const [formMode, setFormMode] = useState(true);
  const [parsedParams, setParsedParams] = useState<ParamInfo[]>([]);

  // Initial Fetch
  useEffect(() => {
    if (!id) return;
    fetchSkill();
    fetchDependencies();
    fetchModels();
  }, [id]);

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
      
      // Select entrypoint by default
      if (data.meta?.entrypoint) {
        selectFile(data.meta.entrypoint);
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
      const res = await fetch(`/api/workbench/skills/${id}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: {
            [selectedFile]: fileContent
          }
        })
      });
      if (!res.ok) throw new Error('Failed to save file');
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

  // AI Code Assistant
  const handleAIChat = async () => {
    if (!chatInput.trim() || !models.length) return;
    
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`/api/workbench/skills/${id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instruction: chatInput,
          modelId: models[0].id // Use first available model for now
        })
      });
      
      if (!res.ok) throw new Error('AI request failed');
      const result = await res.json();
      
      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: `Code generated for ${result.filename}. I have updated the file in the editor.`, 
        timestamp: Date.now() 
      };
      setChatHistory(prev => [...prev, assistantMsg]);
      
      // Refresh current file if it's the one AI updated
      if (selectedFile === result.filename) {
        setFileContent(result.code);
        setOriginalContent(result.code);
      }
      
      toast.success('Skill code updated by AI');
    } catch (err: unknown) {
        const errorMsg: ChatMessage = {
            role: 'system',
            content: `Error: ${(err as Error).message || 'AI generation failed'}`,
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // Execution
  const handleExecute = async () => {
    setRunning(true);
    setRunResult(null);

    try {
      let inputPayload = {};
      try {
        inputPayload = JSON.parse(runInput);
      } catch {
        toast.error('Invalid JSON input');
        setRunning(false);
        return;
      }

      const res = await fetch(`/api/workbench/skills/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputPayload })
      });
      
      const result = await res.json();
      setRunResult(result);
    } catch (err: unknown) {
        toast.error((err as Error).message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleDeploy = async () => {
    if (hasUnsavedChanges) {
      await handleSaveFile();
    }
    toast.success('Skill deployed successfully');
  };

  const handleQuickRun = async () => {
    setRunOpen(true);

    // Parse entrypoint parameters
    if (skill?.meta?.entrypoint) {
        let code = '';
        // If entrypoint is currently open, use current content
        if (selectedFile === skill.meta.entrypoint) {
            code = fileContent;
        } else {
            // Otherwise fetch it
            try {
                const res = await fetch(`/api/workbench/skills/${id}/files?filename=${encodeURIComponent(skill.meta.entrypoint)}`);
                if (res.ok) {
                    const data = await res.json();
                    code = data.content;
                }
            } catch (err) {
                console.error('Failed to fetch entrypoint for parsing', err);
            }
        }

        if (code) {
            const params = parsePythonEntrypoint(code);
            setParsedParams(params);
            
            // If we detected params, default to Form Mode. 
            // If no params (e.g. no main function), fallback to JSON mode.
            if (params.length > 0) {
                setFormMode(true);
                // Pre-fill defaults if input is empty/default
                if (runInput === '{}' || !runInput) {
                    const defaults: Record<string, unknown> = {};
                    params.forEach(p => {
                        if (p.default !== undefined) defaults[p.name] = p.default;
                    });
                    setRunInput(JSON.stringify(defaults, null, 2));
                }
            } else {
                setFormMode(false);
            }
        }
    }
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

        {/* Run Dialog */}
        <Dialog open={runOpen} onOpenChange={setRunOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-green-600" />
                        Run Skill: {skill.name}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Input
                            </Label>
                            {parsedParams.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground font-normal">Form Mode</Label>
                                    <Switch checked={formMode} onCheckedChange={setFormMode} />
                                </div>
                            )}
                        </div>

                        {formMode && parsedParams.length > 0 ? (
                            <div className="border rounded-md p-4 bg-muted/10 max-h-60 overflow-y-auto">
                                <AutoForm 
                                    params={parsedParams}
                                    value={(() => {
                                        try { return JSON.parse(runInput); }
                                        catch { return {}; }
                                    })()}
                                    onChange={(val) => setRunInput(JSON.stringify(val, null, 2))}
                                />
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden h-40">
                                <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    value={runInput}
                                    onChange={(val) => setRunInput(val || '')}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        lineNumbers: 'off',
                                        scrollBeyondLastLine: false,
                                        folding: false,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {runResult && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Box className="w-4 h-4" /> Output
                            </Label>
                            <div className="bg-slate-950 rounded-md p-4 overflow-x-auto">
                                <pre className="text-xs text-slate-100 font-mono">
                                    {JSON.stringify(runResult, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => setRunOpen(false)}>Close</Button>
                    <Button onClick={handleExecute} disabled={running}>
                        {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


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
                         {hasUnsavedChanges && <span className="text-xs text-yellow-600 mr-2">Unsaved changes</span>}
                         <Button size="sm" onClick={handleSaveFile} disabled={savingFile || !hasUnsavedChanges}>
                            {savingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                            Save
                         </Button>
                    </div>
                </div>
                <div className="flex-1 relative">
                    {loadingFile ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <Editor
                            height="100%"
                            defaultLanguage="python"
                            language={selectedFile.endsWith('.py') ? 'python' : 'json'}
                            value={fileContent}
                            onChange={(value) => setFileContent(value || '')}
                            theme="vs-dark" // or light based on system theme
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    )}
                </div>
            </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
             <div className="flex-1 border rounded-md p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4">
                {chatHistory.length === 0 && (
                    <div className="text-center text-muted-foreground mt-20">
                        <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Ask the AI to generate or refine your skill code.</p>
                        <p className="text-xs mt-2">Example: "Add a function to fetch data from an API"</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : msg.role === 'system'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-white dark:bg-slate-800 border shadow-sm'
                        }`}>
                            <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                        </div>
                    </div>
                ))}
                {aiLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    </div>
                )}
             </div>
             
             <div className="flex gap-2">
                <Textarea 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Describe what you want to change..."
                    className="min-h-[60px] max-h-[150px]"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAIChat();
                        }
                    }}
                />
                <Button size="icon" className="h-[60px] w-[60px]" onClick={handleAIChat} disabled={aiLoading || !chatInput.trim()}>
                    {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                </Button>
             </div>
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
