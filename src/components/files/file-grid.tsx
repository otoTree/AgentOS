"use client";

import { useState } from "react";
import { deleteFile, deleteFolder, getDownloadUrl, renameFile, renameFolder, moveFile, moveFolder } from "@/app/file-actions";
import { FilePreviewDialog } from "./file-preview-dialog";
import { ShareDialog } from "./share-dialog";
import { FileWithShares, FolderWithCount } from "./types";
import { Folder, FileText, Image as ImageIcon, File as FileIcon, Eye, Share2, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface FileGridProps {
    files: FileWithShares[];
    folders: FolderWithCount[];
    onNavigate: (folderId: string | null) => void;
    onRefresh: () => void;
    onFileOpen?: (file: FileWithShares) => void;
}

export function FileGrid({ files, folders, onNavigate, onRefresh, onFileOpen }: FileGridProps) {
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
      toast.error("Download failed");
    }
  };

  const handleDeleteFile = async (file: FileWithShares) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await deleteFile(file.id);
        onRefresh();
      } catch (error) {
        toast.error("Delete failed");
      }
    }
  };

  const handleDeleteFolder = async (folder: FolderWithCount) => {
    if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
        try {
            await deleteFolder(folder.id);
            onRefresh();
        } catch (error) {
            toast.error("Delete folder failed");
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
          toast.error("Rename failed");
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
          toast.error(error.message || "Move failed");
      } finally {
          setDraggedId(null);
          setDraggedType(null);
      }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {/* Folders */}
        {folders.map((folder) => (
          <div 
            key={folder.id} 
            className={`group relative flex flex-col items-center p-6 rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer bg-white border border-transparent hover:border-black/5 ${draggedId === folder.id ? 'opacity-50' : ''}`}
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
            <div className="flex items-center justify-center w-16 h-16 bg-zinc-50 rounded-2xl mb-4 text-zinc-400 group-hover:text-zinc-600 transition-colors">
               <Folder className="w-8 h-8" strokeWidth={1.5} />
            </div>
            
            {editingId === folder.id ? (
                <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename('folder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename('folder')}
                    className="text-center border-b border-black outline-none px-1 text-sm w-full bg-transparent"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div className="font-medium truncate text-center text-sm text-zinc-900 w-full" title={folder.name}>{folder.name}</div>
            )}
            
            <div className="text-xs text-zinc-400 text-center mt-1">
                {folder._count?.files || 0} files
            </div>

            {/* Hover Actions */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-zinc-100 p-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => startRename(folder.id, folder.name)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeleteFolder(folder)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-zinc-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}

        {/* Files */}
        {files.map((file) => (
          <div 
            key={file.id} 
            className={`group relative flex flex-col items-center p-6 rounded-xl transition-all duration-300 hover:shadow-lg bg-white border border-transparent hover:border-black/5 ${draggedId === file.id ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => {
                setDraggedId(file.id);
                setDraggedType('file');
                e.dataTransfer.setData('text/plain', file.id);
            }}
          >
            <div className="flex items-center justify-center w-16 h-16 bg-zinc-50 rounded-2xl mb-4 text-zinc-400 group-hover:text-zinc-600 transition-colors cursor-pointer" onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)}>
               {file.mimeType.startsWith("image/") ? <ImageIcon className="w-8 h-8" strokeWidth={1.5} /> :
                file.mimeType === "application/pdf" ? <FileText className="w-8 h-8" strokeWidth={1.5} /> :
                <FileIcon className="w-8 h-8" strokeWidth={1.5} />}
            </div>
            
            {editingId === file.id ? (
                <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename('file')}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename('file')}
                    className="text-center border-b border-black outline-none px-1 text-sm w-full bg-transparent"
                    autoFocus
                />
            ) : (
                <div className="font-medium truncate text-center text-sm text-zinc-900 w-full" title={file.name}>{file.name}</div>
            )}

            <div className="text-xs text-zinc-400 text-center mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </div>
            
            {/* Hover Actions */}
             <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-zinc-100 p-1">
                <button onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Preview/Edit"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => setShareFile(file)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Share"><Share2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Download"><Download className="w-3.5 h-3.5" /></button>
                <button onClick={() => startRename(file.id, file.name)} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-900 transition-colors" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDeleteFile(file)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-zinc-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        
        {files.length === 0 && folders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <Folder className="w-6 h-6 text-zinc-300" />
            </div>
            <p className="text-zinc-500 font-medium">This folder is empty</p>
            <p className="text-sm text-zinc-400 mt-1">Upload files or create a folder to get started</p>
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