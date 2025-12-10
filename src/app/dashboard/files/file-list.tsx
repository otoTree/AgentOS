"use client";

import { useState } from "react";
import { deleteFile, deleteFolder, getDownloadUrl, renameFile, renameFolder, moveFile, moveFolder } from "./actions";
import { FilePreviewDialog } from "./file-preview-dialog";
import { ShareDialog } from "./share-dialog";
import { FileWithShares, FolderWithCount } from "./types";
import { Folder, FileText, Image as ImageIcon, File as FileIcon, Eye, Share2, Download, Pencil, Trash2 } from "lucide-react";

interface FileListProps {
    files: FileWithShares[];
    folders: FolderWithCount[];
    onNavigate: (folderId: string | null) => void;
    onRefresh: () => void;
    onFileOpen?: (file: FileWithShares) => void;
}

export function FileList({ files, folders, onNavigate, onRefresh, onFileOpen }: FileListProps) {
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
    if (draggedId === targetFolderId) return;

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
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Modified</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {/* Folders */}
                {folders.map((folder) => (
                    <tr 
                        key={folder.id} 
                        className={`border-b hover:bg-muted/50 cursor-pointer ${draggedId === folder.id ? 'opacity-50' : ''}`}
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
                        <td className="px-4 py-3 font-medium">
                             <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-blue-500" />
                                {editingId === folder.id ? (
                                    <input 
                                        type="text" 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleRename('folder')}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename('folder')}
                                        className="border rounded px-1 w-full max-w-[200px]"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span>{folder.name}</span>
                                )}
                             </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">-</td>
                        <td className="px-4 py-3 text-muted-foreground">Folder</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(folder.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => startRename(folder.id, folder.name)} className="text-muted-foreground hover:text-foreground" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteFolder(folder)} className="text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </td>
                    </tr>
                ))}

                {/* Files */}
                {files.map((file) => (
                    <tr 
                        key={file.id} 
                        className={`border-b hover:bg-muted/50 ${draggedId === file.id ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                            setDraggedId(file.id);
                            setDraggedType('file');
                            e.dataTransfer.setData('text/plain', file.id);
                        }}
                    >
                        <td className="px-4 py-3 font-medium">
                             <div className="flex items-center gap-2 cursor-pointer" onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)}>
                                <span className="text-muted-foreground">
                                    {file.mimeType.startsWith("image/") ? <ImageIcon className="w-4 h-4" /> :
                                     file.mimeType === "application/pdf" ? <FileText className="w-4 h-4" /> :
                                     <FileIcon className="w-4 h-4" />}
                                </span>
                                {editingId === file.id ? (
                                    <input 
                                        type="text" 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleRename('file')}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename('file')}
                                        className="border rounded px-1 w-full max-w-[200px]"
                                        autoFocus
                                    />
                                ) : (
                                    <span>{file.name}</span>
                                )}
                             </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3 text-muted-foreground">{file.mimeType.split('/').pop()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(file.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)} className="text-muted-foreground hover:text-foreground" title="Preview/Edit"><Eye className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setShareFile(file)} className="text-muted-foreground hover:text-foreground" title="Share"><Share2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDownload(file)} className="text-muted-foreground hover:text-foreground" title="Download"><Download className="w-3.5 h-3.5" /></button>
                                <button onClick={() => startRename(file.id, file.name)} className="text-muted-foreground hover:text-foreground" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteFile(file)} className="text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </td>
                    </tr>
                ))}

                {files.length === 0 && folders.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                            This folder is empty.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
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