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
import { Upload, Trash2, FileIcon, Folder, FolderPlus, Share2, ArrowLeft, ChevronRight, MoreVertical, Link as LinkIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@agentos/web/components/ui/dropdown-menu';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { CreateFileDialog } from '@agentos/web/components/file-manager';
import { Loader2, FilePlus, Download } from 'lucide-react';
import { ShareLinkDialog } from '@/components/dataset/ShareLinkDialog';

const DocxEditor = dynamic(
  () => import('@agentos/web/components/file-manager').then((mod) => mod.DocxEditor),
  { ssr: false }
);

const ExcelEditor = dynamic(
  () => import('@agentos/office').then((mod) => mod.Excel.ExcelEditor),
  { ssr: false }
);

const PPTEditor = dynamic(
  () => import('@agentos/web/components/ppt').then((mod) => mod.PPTEditor),
  { ssr: false }
);

const FileEditor = dynamic(
  () => import('@agentos/web/components/file-manager').then((mod) => mod.FileEditor),
  { ssr: false }
);
const FilePreview = dynamic(
  () => import('@agentos/web/components/file-manager').then((mod) => mod.FilePreview),
  { ssr: false }
);

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

  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [fileForLinkShare, setFileForLinkShare] = useState<{id: string, name: string} | null>(null);

  // File Preview/Edit State
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excelEditorRef = React.useRef<any>(null);

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

  const handleCreateFile = async (name: string, type: 'file' | 'folder' | 'excel') => {
      if (type === 'folder') {
          setNewFolderName(name);
          // reuse createFolder logic but adjusted for arguments
          // Wait, createFolder uses state newFolderName. 
          // Let's just set state and call createFolder? 
          // Or refactor createFolder.
          // Since CreateFileDialog passes name, let's call API directly here.
          
          try {
            const res = await fetch('/api/dataset/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    parentId: currentFolderId,
                    teamId: activeTab === 'team' ? selectedTeam : undefined
                })
            });
            if (res.ok) {
                setCreateFileOpen(false);
                loadDataset();
            } else {
                alert('Failed to create folder');
            }
          } catch {
              alert('Error creating folder');
          }
      } else if (type === 'excel') {
          // Create Empty Excel File
          // We can create an empty file with .xlsx extension.
          // Ideally we should generate a valid empty xlsx binary.
          // But for now, let's try creating a file with .xlsx extension and let the editor handle initialization if empty?
          // No, ExcelJS needs a valid zip structure.
          // We can use the ExcelAdapter (if exposed) or just fetch to a specialized endpoint?
          // Or we can just create a dummy file and rely on backend? 
          // Best way: Create an empty workbook in browser using ExcelAdapter logic if possible, or simple empty buffer.
          // Let's rely on importing ExcelAdapter to create empty blob.
          
          try {
             // Dynamic import to avoid SSR issues if adapter uses browser specific things (though it shouldn't)
             const { Excel } = await import('@agentos/office');
             const { ExcelAdapter } = Excel;
             const emptySheet = {
                 id: 'Sheet1',
                 name: 'Sheet1',
                 rowCount: 100,
                 colCount: 26,
                 cells: new Map(),
                 mergedCells: [],
                 styles: {}
             };
             const blob = await ExcelAdapter.sheetDataToBlob(emptySheet);
             
             const fileName = name.endsWith('.xlsx') ? name : `${name}.xlsx`;
             const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
             
             const formData = new FormData();
             formData.append('file', file);
             if (activeTab === 'team' && selectedTeam) {
                formData.append('teamId', selectedTeam);
             }
             if (currentFolderId) {
                formData.append('folderId', currentFolderId);
             }

             const res = await fetch('/api/dataset/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                setCreateFileOpen(false);
                loadDataset();
            } else {
                const err = await res.json();
                alert(`Create failed: ${err.error}`);
            }
          } catch (e) {
              console.error(e);
              alert('Failed to create excel file');
          }
      } else {
          // Create Empty File
          const formData = new FormData();
          // Use a space to ensure file is not empty (some systems reject 0-byte files)
          const emptyFile = new File(["New File Content"], name, { type: "text/plain" });
          formData.append('file', emptyFile);
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
                setCreateFileOpen(false);
                loadDataset();
            } else {
                const err = await res.json();
                alert(`Create failed: ${err.error}`);
            }
          } catch (e) {
              console.error(e);
              alert('Create failed');
          }
      }
  };

  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [pptBlob, setPptBlob] = useState<Blob | null>(null);

    // ...

    const openFile = async (file: FileData) => {
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'pdf'].includes(ext);
      
      if (ext === 'docx') {
        setViewMode('edit');
        return;
      }
      
      if (ext === 'xlsx') {
        setViewMode('edit');
        setLoadingFile(true);
        try {
            const res = await fetch(`/api/dataset/file?id=${file.id}&raw=true`);
            if (res.ok) {
                const blob = await res.blob();
                setExcelBlob(blob);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setLoadingFile(false);
        }
        return;
      }

      if (ext === 'pptx') {
        setViewMode('edit');
        setLoadingFile(true);
        try {
            const res = await fetch(`/api/dataset/file?id=${file.id}&raw=true`);
            if (res.ok) {
                const blob = await res.blob();
                setPptBlob(blob);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setLoadingFile(false);
        }
        return;
      }

      if (!isMedia) {
          // Load content
          setLoadingFile(true);
          try {
            const res = await fetch(`/api/dataset/file?id=${file.id}&raw=true`);
            if (res.ok) {
                const text = await res.text();
                setFileContent(text);
                setViewMode('preview'); // Default to preview
            } else {
                setFileContent('Failed to load content');
            }
          } catch {
              setFileContent('Failed to load content');
          } finally {
              setLoadingFile(false);
          }
      } else {
          setViewMode('preview');
      }
  };

  const handleSaveExcel = async () => {
      if (!selectedFile || !excelEditorRef.current) return;
      setSavingFile(true);
      try {
          const blob = await excelEditorRef.current.save();
          // Upload blob
          const formData = new FormData();
          formData.append('fileId', selectedFile.id);
          formData.append('file', new File([blob], selectedFile.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
          
          const res = await fetch('/api/dataset/upload', {
              method: 'POST',
              body: formData
          });
          
          if (res.ok) {
              alert('Saved');
              // Update size in list if possible
              loadDataset();
          } else {
              alert('Failed to save');
          }
      } catch (e) {
          console.error(e);
          alert('Error saving excel file');
      } finally {
          setSavingFile(false);
      }
  };

  const handleSaveFile = async () => {
      if (!selectedFile) return;
      setSavingFile(true);
      try {
          const res = await fetch(`/api/dataset/file?id=${selectedFile.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: fileContent })
          });
          if (res.ok) {
              alert('Saved');
          } else {
              alert('Failed to save');
          }
      } catch {
          alert('Error saving');
      } finally {
          setSavingFile(false);
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
                                <Button onClick={() => setCreateFileOpen(true)}>
                                    <FilePlus className="w-4 h-4 mr-2" />
                                    New
                                </Button>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={handleUpload}
                                        disabled={uploading}
                                    />
                                    <Button variant="outline" disabled={uploading}>
                                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Upload
                                    </Button>
                                </div>
                                <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <FolderPlus className="w-4 h-4 mr-2" />
                                            Folder
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
                                        <TableRow key={file.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openFile(file)}>
                                            <TableCell><FileIcon className="w-4 h-4 text-blue-500" /></TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {file.name}
                                                    {file.isShared && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Shared</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                                            <TableCell>{file.uploader?.name}</TableCell>
                                            <TableCell>{format(new Date(file.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <a href={file.url} download onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </a>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFileForLinkShare({ id: file.id, name: file.name });
                                                                setShareLinkOpen(true);
                                                            }}>
                                                                <LinkIcon className="w-4 h-4 mr-2" /> Share Link
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFileForShare(file.id);
                                                                setShareOpen(true);
                                                            }}>
                                                                <Share2 className="w-4 h-4 mr-2" /> Share to Team
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFile(file.id);
                                                            }}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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

        {/* File Preview/Edit Dialog */}
        <Dialog open={!!selectedFile} onOpenChange={(o) => !o && setSelectedFile(null)}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{selectedFile?.name}</DialogTitle>
                        <div className="flex items-center gap-2 mr-6">
                            {/* Toggle Edit/Preview if text/markdown */}
                            {selectedFile && !['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'pdf', 'docx', 'xlsx', 'pptx'].includes(selectedFile.name.split('.').pop()?.toLowerCase() || '') && (
                                <>
                                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'edit')} className="h-8">
                                        <TabsList className="h-8">
                                            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                                            <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    {viewMode === 'edit' && (
                                        <Button size="sm" onClick={handleSaveFile} disabled={savingFile}>
                                            {savingFile && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                            Save
                                        </Button>
                                    )}
                                </>
                            )}
                            {selectedFile?.name.endsWith('.xlsx') && (
                                <Button size="sm" onClick={handleSaveExcel} disabled={savingFile}>
                                    {savingFile && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                    Save
                                </Button>
                            )}
                            <a href={selectedFile?.url} download onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline">Download</Button>
                            </a>
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900">
                    {loadingFile ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        selectedFile && (
                            selectedFile.name.endsWith('.docx') ? (
                                <DocxEditor
                                    fileName={selectedFile.name}
                                    fileUrl={`/api/dataset/file?id=${selectedFile.id}&raw=true`}
                                    onSave={async (blob) => {
                                        try {
                                            const formData = new FormData();
                                            formData.append('file', blob, selectedFile.name);
                                            formData.append('fileId', selectedFile.id);
                                            
                                            const res = await fetch('/api/dataset/upload', {
                                                method: 'POST',
                                                body: formData
                                            });
                                            
                                            if (!res.ok) {
                                                const err = await res.json();
                                                throw new Error(err.error || 'Failed to save');
                                            }
                                            alert('Saved successfully');
                                            loadDataset();
                                        } catch (e) {
                                            console.error(e);
                                            alert('Failed to save');
                                        }
                                    }}
                                />
                            ) : selectedFile.name.endsWith('.xlsx') ? (
                                excelBlob && (
                                    <ExcelEditor
                                        ref={excelEditorRef}
                                        className="h-full w-full"
                                        file={excelBlob}
                                    />
                                )
                            ) : selectedFile.name.endsWith('.pptx') ? (
                                pptBlob && (
                                    <PPTEditor
                                        className="h-full w-full"
                                        file={pptBlob}
                                    />
                                )
                            ) : viewMode === 'preview' ? (
                                <FilePreview 
                                    name={selectedFile.name}
                                    url={`/api/dataset/file?id=${selectedFile.id}&raw=true`} // Use raw endpoint for correct content-type
                                    content={fileContent} // Provide content for text files if loaded
                                    className="h-full w-full"
                                />
                            ) : (
                                <FileEditor 
                                    content={fileContent}
                                    fileName={selectedFile.name}
                                    onChange={(v) => setFileContent(v || '')}
                                    className="h-full w-full"
                                />
                            )
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>

        <CreateFileDialog 
            open={createFileOpen} 
            onOpenChange={setCreateFileOpen} 
            onCreate={handleCreateFile} 
        />

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

        <ShareLinkDialog 
            open={shareLinkOpen} 
            onOpenChange={setShareLinkOpen} 
            fileId={fileForLinkShare?.id || ''} 
            fileName={fileForLinkShare?.name || ''} 
        />

      </Tabs>
    </AdminLayout>
  );
}