"use client";

import { useState, useEffect, useCallback } from "react";
import { FileWithShares, FolderWithCount, ViewMode, BreadcrumbItem } from "./types";
import { getFiles, getFolders, getBreadcrumbs, createFolder, createFile, deleteFile, deleteFolder, renameFile, renameFolder, moveFile, moveFolder } from "./actions";
import { FileGrid } from "./file-grid";
import { FileList } from "./file-list";
import { FileUploader } from "./file-uploader";
import { SearchBar } from "./search-bar";
import { FolderDialog } from "./folder-dialog";
import { CreateFileDialog } from "./create-file-dialog";
import { FilePreviewDialog } from "./file-preview-dialog";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Grid, List, Plus } from "lucide-react";

export function FileExplorer({ 
    initialSearch,
    mode = 'page',
    onFileOpen
}: { 
    initialSearch?: string;
    mode?: 'page' | 'embedded';
    onFileOpen?: (file: FileWithShares) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFolderId = searchParams.get("folderId") || null;

  // State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [files, setFiles] = useState<FileWithShares[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch || "");
  
  // Dialogs
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreateFileOpen, setIsCreateFileOpen] = useState(false);
  
  // Auto-open new file
  const [autoOpenFile, setAutoOpenFile] = useState<FileWithShares | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedFolders, fetchedFiles, fetchedBreadcrumbs] = await Promise.all([
        getFolders(currentFolderId),
        getFiles(search, currentFolderId),
        getBreadcrumbs(currentFolderId)
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      setBreadcrumbs(fetchedBreadcrumbs);
    } catch (error) {
      console.error("Failed to load explorer data", error);
    } finally {
        setIsLoading(false);
    }
  }, [currentFolderId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL sync for folder navigation (optional but good for UX)
  useEffect(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (currentFolderId) {
          params.set("folderId", currentFolderId);
      } else {
          params.delete("folderId");
      }
      // Use replace to avoid cluttering history stack too much, or push if we want back button support
      // router.replace(`?${params.toString()}`); 
      // Actually, let's just keep internal state for now to avoid complex sync issues, 
      // unless user specifically wants deep linking (which initialFolderId handles)
  }, [currentFolderId, searchParams]);

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    
    if (mode === 'page') {
        // Update URL
        const params = new URLSearchParams(searchParams.toString());
        if (folderId) {
            params.set("folderId", folderId);
        } else {
            params.delete("folderId");
        }
        router.push(`/dashboard/files?${params.toString()}`);
    }
  };

  const handleCreateFolder = async (name: string) => {
      await createFolder(name, currentFolderId);
      loadData();
      setIsCreateFolderOpen(false);
  };

  const handleCreateFile = async (name: string) => {
      const newFile = await createFile(name, currentFolderId);
      await loadData(); // Refresh to get the file in the list (and ensure we have latest data)
      setIsCreateFileOpen(false);
      // Find the new file in the updated list or use the return value to open it
      // We need to cast it to FileWithShares or fetch it properly.
      // The return value from createFile includes shares, so it matches FileWithShares structure roughly
      if (newFile) {
        setAutoOpenFile(newFile as unknown as FileWithShares);
      }
  };

  const handleFileUploaded = () => {
      loadData();
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-card p-2 rounded-lg border">
        <div className="flex items-center gap-2 overflow-hidden">
             {/* Navigation Controls */}
             <button 
                onClick={() => handleNavigate(breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null)}
                disabled={!currentFolderId}
                className="p-2 hover:bg-muted rounded disabled:opacity-30"
             >
                 <ArrowLeft className="w-5 h-5" />
             </button>
             
             {/* Breadcrumbs */}
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
             {/* View Toggles */}
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

      {/* Search */}
      <SearchBar initialSearch={search} onSearch={(val) => setSearch(val)} />

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border p-4 overflow-y-auto">
          {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
              </div>
          ) : (
              viewMode === 'grid' ? (
                  <FileGrid 
                    files={files} 
                    folders={folders} 
                    onNavigate={handleNavigate}
                    onRefresh={loadData}
                  />
              ) : (
                  <FileList 
                    files={files} 
                    folders={folders} 
                    onNavigate={handleNavigate}
                    onRefresh={loadData}
                  />
              )
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