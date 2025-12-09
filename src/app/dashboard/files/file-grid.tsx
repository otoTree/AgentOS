"use client";

import { useState } from "react";
import { deleteFile, deleteFolder, getDownloadUrl, renameFile, renameFolder, moveFile, moveFolder } from "./actions";
import { FilePreviewDialog } from "./file-preview-dialog";
import { ShareDialog } from "./share-dialog";
import { FileWithShares, FolderWithCount } from "./types";
import { Folder, FileText, Image as ImageIcon, File as FileIcon, Eye, Share2, Download, Pencil, Trash2 } from "lucide-react";

interface FileGridProps {
    files: FileWithShares[];
    folders: FolderWithCount[];
    onNavigate: (folderId: string | null) => void;
    onRefresh: () => void;
}

export function FileGrid({ files, folders, onNavigate, onRefresh }: FileGridProps) {
  const [previewFile, setPreviewFile] = useState<FileWithShares | null>(null);
  const [shareFile, setShareFile] = useState<FileWithShares | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  
  // Drag and Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<'file' | 'folder' | null>(null);

  const handleDownload = async (file: FileWithShares) => {
    try {
      const url = await getDownloadUrl(file.id);
      const downloadUrl = new URL(url, window.location.origin);
      downloadUrl.searchParams.set("download", "true");
      window.open(downloadUrl.toString(), "_blank");
    } catch (error) {
      alert("Download failed");
    }
  };

  const handleDeleteFile = async (file: FileWithShares) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await deleteFile(file.id);
        onRefresh();
      } catch (error) {
        alert("Delete failed");
      }
    }
  };

  const handleDeleteFolder = async (folder: FolderWithCount) => {
    if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
        try {
            await deleteFolder(folder.id);
            onRefresh();
        } catch (error) {
            alert("Delete folder failed");
        }
    }
  };

  const startRename = (id: string, currentName: string) => {
      setEditingId(id);
      setEditName(currentName);
  };

  const handleRename = async (type: 'file' | 'folder') => {
      if (!editingId || !editName.trim()) return;
      
      try {
          if (type === 'file') {
              await renameFile(editingId, editName);
          } else {
              await renameFolder(editingId, editName);
          }
          setEditingId(null);
          onRefresh();
      } catch (error) {
          alert("Rename failed");
      }
  };

  const handleDrop = async (targetFolderId: string) => {
      if (!draggedId || !draggedType) return;
      if (draggedId === targetFolderId) return; // Can't drop on itself

      try {
          if (draggedType === 'file') {
              await moveFile(draggedId, targetFolderId);
          } else {
              await moveFolder(draggedId, targetFolderId);
          }
          onRefresh();
      } catch (error: any) {
          alert(error.message || "Move failed");
      } finally {
          setDraggedId(null);
          setDraggedType(null);
      }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Folders */}
        {folders.map((folder) => (
          <div 
            key={folder.id} 
            className={`group border rounded-lg p-4 flex flex-col gap-2 hover:shadow-md transition-shadow bg-card cursor-pointer relative ${draggedId === folder.id ? 'opacity-50' : ''}`}
            onClick={() => onNavigate(folder.id)}
            draggable
            onDragStart={(e) => {
                setDraggedId(folder.id);
                setDraggedType('folder');
                e.dataTransfer.setData('text/plain', folder.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(folder.id);
            }}
          >
            <div className="flex items-center justify-center h-24 bg-blue-50 dark:bg-blue-900/20 rounded mb-2 text-blue-500">
               <Folder className="w-12 h-12" />
            </div>
            
            {editingId === folder.id ? (
                <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename('folder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename('folder')}
                    className="text-center border rounded px-1 text-sm w-full"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div className="font-medium truncate text-center text-sm" title={folder.name}>{folder.name}</div>
            )}
            
            <div className="text-xs text-muted-foreground text-center">
                {folder._count?.files || 0} files
            </div>

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 rounded shadow-sm" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => startRename(folder.id, folder.name)} className="p-1 hover:bg-muted rounded text-xs" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeleteFolder(folder)} className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded text-xs" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}

        {/* Files */}
        {files.map((file) => (
          <div 
            key={file.id} 
            className={`group border rounded-lg p-4 flex flex-col gap-2 hover:shadow-md transition-shadow bg-card relative ${draggedId === file.id ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => {
                setDraggedId(file.id);
                setDraggedType('file');
                e.dataTransfer.setData('text/plain', file.id);
            }}
          >
            <div className="flex items-center justify-center h-24 bg-muted rounded mb-2 cursor-pointer" onClick={() => setPreviewFile(file)}>
              <span className="text-4xl text-muted-foreground">
                 {file.mimeType.startsWith("image/") ? <ImageIcon className="w-10 h-10" /> :
                  file.mimeType === "application/pdf" ? <FileText className="w-10 h-10" /> :
                  <FileIcon className="w-10 h-10" />}
              </span>
            </div>
            
            {editingId === file.id ? (
                <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename('file')}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename('file')}
                    className="text-center border rounded px-1 text-sm w-full"
                    autoFocus
                />
            ) : (
                <div className="font-medium truncate text-center text-sm" title={file.name}>{file.name}</div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              {(file.size / 1024).toFixed(1)} KB
            </div>
            
            {/* Hover Actions */}
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 rounded shadow-sm">
                <button onClick={() => setPreviewFile(file)} className="p-1 hover:bg-muted rounded text-xs" title="Preview/Edit"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShareFile(file)} className="p-1 hover:bg-muted rounded text-xs" title="Share"><Share2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDownload(file)} className="p-1 hover:bg-muted rounded text-xs" title="Download"><Download className="w-3.5 h-3.5" /></button>
                <button onClick={() => startRename(file.id, file.name)} className="p-1 hover:bg-muted rounded text-xs" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeleteFile(file)} className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded text-xs" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        
        {files.length === 0 && folders.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            This folder is empty.
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewDialog
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open: boolean) => !open && setPreviewFile(null)}
        />
      )}

      {shareFile && (
        <ShareDialog
          file={shareFile}
          open={!!shareFile}
          onOpenChange={(open: boolean) => !open && setShareFile(null)}
        />
      )}
    </>
  );
}