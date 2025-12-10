"use client";

import { useState, useEffect, useCallback } from "react";
import { getFiles, getFolders, getBreadcrumbs, createFolder, createFile, deleteFile, deleteFolder, renameFile, renameFolder, moveFile, moveFolder, addFileToConversation, removeFileFromConversation, getDownloadUrl, getPublicTools, getUserTools } from "../actions";
import { FileList, FileGrid, FileUploader, SearchBar, FolderDialog, CreateFileDialog, FilePreviewDialog } from "../components";
import { ArrowLeft, Grid, List, Plus, CheckSquare, Square, Check, Trash2 } from "lucide-react";
import { FileWithShares, FolderWithCount } from "../components";

interface ContextManagerProps {
    conversationId: string;
    attachedFileIds: string[];
    onAttachToggle: (fileId: string, attach: boolean) => Promise<void>;
}

export function FileManager({ conversationId, attachedFileIds, onAttachToggle }: ContextManagerProps) {
  const [files, setFiles] = useState<FileWithShares[]>([]);
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string | null, name: string}[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreateFileOpen, setIsCreateFileOpen] = useState(false);
  const [autoOpenFile, setAutoOpenFile] = useState<FileWithShares | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [filesData, foldersData, breadcrumbsData] = await Promise.all([
            getFiles(search, currentFolderId),
            getFolders(currentFolderId),
            getBreadcrumbs(currentFolderId)
        ]);
        setFiles(filesData);
        setFolders(foldersData);
        setBreadcrumbs(breadcrumbsData);
    } catch (error) {
        console.error("Failed to load files", error);
    } finally {
        setIsLoading(false);
    }
  }, [currentFolderId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (name: string) => {
      await createFolder(name, currentFolderId);
      loadData();
      setIsCreateFolderOpen(false);
  };

  const handleCreateFile = async (name: string) => {
      const newFile = await createFile(name, currentFolderId);
      await loadData();
      setIsCreateFileOpen(false);
      if (newFile) {
        setAutoOpenFile(newFile as unknown as FileWithShares);
      }
  };

  const handleFileUploaded = () => {
      loadData();
  };

  const handleAttachToggle = async (file: FileWithShares) => {
      const isAttached = attachedFileIds.includes(file.id);
      await onAttachToggle(file.id, !isAttached);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-card p-2 rounded-lg border">
        <div className="flex items-center gap-2 overflow-hidden">
             <button 
                onClick={() => handleNavigate(breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null)}
                disabled={!currentFolderId}
                className="p-2 hover:bg-muted rounded disabled:opacity-30"
             >
                 <ArrowLeft className="w-5 h-5" />
             </button>
             
             <div className="flex items-center text-sm font-medium overflow-x-auto whitespace-nowrap no-scrollbar">
                 <button 
                    onClick={() => handleNavigate(null)}
                    className={`hover:bg-muted px-2 py-1 rounded ${!currentFolderId ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                 >
                     Home
                 </button>
                 {breadcrumbs.map((crumb, index) => (
                     <div key={crumb.id} className="flex items-center">
                         <span className="text-muted-foreground mx-1">/</span>
                         <button 
                            onClick={() => handleNavigate(crumb.id)}
                            className={`hover:bg-muted px-2 py-1 rounded ${index === breadcrumbs.length - 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                         >
                             {crumb.name}
                         </button>
                     </div>
                 ))}
             </div>
        </div>

        <div className="flex items-center gap-2">
             <div className="flex bg-muted p-1 rounded-md">
                 <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                    title="Grid View"
                >
                    <Grid className="w-4 h-4" />
                </button>
                <button
                   onClick={() => setViewMode('list')}
                   className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                   title="List View"
                >
                    <List className="w-4 h-4" />
                </button>
             </div>
             
             <button
                onClick={() => setIsCreateFileOpen(true)}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded text-sm font-medium flex items-center gap-2"
             >
                 <Plus className="w-4 h-4" /> File
             </button>

             <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded text-sm font-medium flex items-center gap-2"
             >
                 <Plus className="w-4 h-4" /> Folder
             </button>
             
             <FileUploader folderId={currentFolderId} onUploadComplete={handleFileUploaded} />
        </div>
      </div>

      <SearchBar initialSearch={search} onSearch={(val) => setSearch(val)} />

      <div className="flex-1 min-h-0 bg-card rounded-lg border overflow-y-auto">
          {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
              </div>
          ) : (
              <div className="p-4">
                  {viewMode === 'list' ? (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 w-10">Attach</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Size</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Modified</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {folders.map(folder => (
                                    <tr key={folder.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => handleNavigate(folder.id)}>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 font-medium">{folder.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">-</td>
                                        <td className="px-4 py-3 text-muted-foreground">Folder</td>
                                        <td className="px-4 py-3 text-muted-foreground">{new Date(folder.updatedAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id).then(loadData); }} className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {files.map(file => {
                                    const isAttached = attachedFileIds.includes(file.id);
                                    return (
                                        <tr key={file.id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <button onClick={() => handleAttachToggle(file)} className={isAttached ? "text-green-500" : "text-muted-foreground"}>
                                                    {isAttached ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                <span onClick={() => setAutoOpenFile(file)} className="cursor-pointer hover:underline">{file.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</td>
                                            <td className="px-4 py-3 text-muted-foreground">{file.mimeType.split('/').pop()}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{new Date(file.updatedAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right">
                                                 <button onClick={() => deleteFile(file.id).then(loadData)} className="text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                  ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {folders.map(folder => (
                              <div key={folder.id} className="border rounded p-4 hover:bg-muted/50 cursor-pointer" onClick={() => handleNavigate(folder.id)}>
                                  <div className="text-center font-medium">{folder.name}</div>
                                  <div className="text-center text-xs text-muted-foreground">Folder</div>
                              </div>
                          ))}
                          {files.map(file => {
                              const isAttached = attachedFileIds.includes(file.id);
                              return (
                                  <div key={file.id} className={`border rounded p-4 relative ${isAttached ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'hover:bg-muted/50'}`}>
                                      <button 
                                        onClick={() => handleAttachToggle(file)}
                                        className="absolute top-2 left-2"
                                      >
                                          {isAttached ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                                      </button>
                                      <div className="text-center font-medium mt-4 cursor-pointer hover:underline" onClick={() => setAutoOpenFile(file)}>{file.name}</div>
                                      <div className="text-center text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}
      </div>

      <FolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onSubmit={handleCreateFolder}
      />
      
      <CreateFileDialog
        open={isCreateFileOpen}
        onOpenChange={setIsCreateFileOpen}
        onSubmit={handleCreateFile}
      />

      {autoOpenFile && (
        <FilePreviewDialog
          file={autoOpenFile}
          open={!!autoOpenFile}
          onOpenChange={(open) => !open && setAutoOpenFile(null)}
        />
      )}
    </div>
  );
}

// Re-export ContextManager as alias for FileManager for backward compatibility
export { FileManager as ContextManager };


interface ToolManagerProps {
    enabledTools: any[];
    onToggleTool: (toolId: string) => void;
}

export function ToolManager({ enabledTools, onToggleTool }: ToolManagerProps) {
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
    const [publicTools, setPublicTools] = useState<any[]>([]);
    const [userTools, setUserTools] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Load tools based on tab
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                if (activeTab === 'public') {
                    if (publicTools.length === 0) {
                         const tools = await getPublicTools();
                         setPublicTools(tools || []);
                    }
                } else {
                    if (userTools.length === 0) {
                         const tools = await getUserTools();
                         setUserTools(tools || []);
                    }
                }
            } catch (e) {
                console.error("Failed to load tools", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [activeTab]);

    const toolsToDisplay = activeTab === 'public' ? publicTools : userTools;
    const filteredTools = toolsToDisplay.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.projectName?.toLowerCase().includes(search.toLowerCase())
    );

    // Group tools by project
    const groups: Record<string, any[]> = {};
    filteredTools.forEach(t => {
        const pname = t.projectName || 'Unknown Project';
        if (!groups[pname]) groups[pname] = [];
        groups[pname].push(t);
    });

    return (
        <div className="h-full flex flex-col gap-4 p-4">
           {/* Tabs */}
           <div className="flex p-1 bg-muted/50 rounded-lg">
               <button 
                  onClick={() => setActiveTab('public')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'public' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
               >
                   Market Tools
               </button>
               <button 
                  onClick={() => setActiveTab('private')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'private' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
               >
                   User Tools
               </button>
           </div>

           <SearchBar initialSearch={search} onSearch={(val) => setSearch(val)} placeholder="Search tools..." />

           <div className="flex-1 overflow-y-auto space-y-4">
               {isLoading ? (
                   <div className="flex items-center justify-center py-8 text-muted-foreground">
                       Loading...
                   </div>
               ) : filteredTools.length === 0 ? (
                   <div className="text-center text-muted-foreground text-sm py-8">
                       No tools found.
                   </div>
               ) : (
                   Object.entries(groups).map(([project, tools]) => (
                        <div key={project} className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{project}</h4>
                            <div className="space-y-2">
                                {tools.map(tool => {
                                    const isEnabled = enabledTools.some((t: any) => t.id === tool.id);
                                    return (
                                        <div key={tool.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-medium text-sm">{tool.name}</h4>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                                                </div>
                                                <button
                                                    onClick={() => onToggleTool(tool.id)}
                                                    className={`text-xs px-2 py-1 rounded-md border shrink-0 transition-colors ${
                                                        isEnabled
                                                        ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                    }`}
                                                >
                                                    {isEnabled ? 'Enabled' : 'Enable'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                   ))
               )}
           </div>
        </div>
    );
}
