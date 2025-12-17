"use client";

import { useState } from "react";
import { deleteFile, deleteFolder, getDownloadUrl, renameFile, renameFolder, moveFile, moveFolder } from "@/app/file-actions";
import { FilePreviewDialog } from "./file-preview-dialog";
import { ShareDialog } from "./share-dialog";
import { FileWithShares, FolderWithCount } from "./types";
import { Folder, FileText, Image as ImageIcon, File as FileIcon, Eye, Share2, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from '@/components/ui/sonner';

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
    if (draggedId === targetFolderId) return;

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
      <div className="w-full overflow-x-auto rounded-lg border border-black/5">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/50 border-b border-black/5">
                <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Name</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Size</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Type</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Modified</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-black/5 bg-white">
                {/* Folders */}
                {folders.map((folder) => (
                    <tr 
                        key={folder.id} 
                        className={`group hover:bg-zinc-50/50 transition-colors cursor-pointer ${draggedId === folder.id ? 'opacity-50' : ''}`}
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
                        <td className="px-6 py-4 font-medium">
                             <div className="flex items-center gap-3">
                                <Folder className="w-5 h-5 text-zinc-400 fill-zinc-50" strokeWidth={1.5} />
                                {editingId === folder.id ? (
                                    <input 
                                        type="text" 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleRename('folder')}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename('folder')}
                                        className="border-b border-black outline-none px-1 w-full max-w-[200px] bg-transparent"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-zinc-900">{folder.name}</span>
                                )}
                             </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 tabular-nums">-</td>
                        <td className="px-6 py-4 text-zinc-400">Folder</td>
                        <td className="px-6 py-4 text-zinc-400 tabular-nums">{new Date(folder.updatedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startRename(folder.id, folder.name)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900" title="Rename"><Pencil className="w-4 h-4" strokeWidth={1.5} /></button>
                                <button onClick={() => handleDeleteFolder(folder)} className="p-1.5 hover:bg-red-50 rounded text-zinc-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
                            </div>
                        </td>
                    </tr>
                ))}

                {/* Files */}
                {files.map((file) => (
                    <tr 
                        key={file.id} 
                        className={`group hover:bg-zinc-50/50 transition-colors ${draggedId === file.id ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                            setDraggedId(file.id);
                            setDraggedType('file');
                            e.dataTransfer.setData('text/plain', file.id);
                        }}
                    >
                        <td className="px-6 py-4 font-medium">
                             <div className="flex items-center gap-3 cursor-pointer" onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)}>
                                <span className="text-zinc-400">
                                    {file.mimeType.startsWith("image/") ? <ImageIcon className="w-5 h-5" strokeWidth={1.5} /> :
                                     file.mimeType === "application/pdf" ? <FileText className="w-5 h-5" strokeWidth={1.5} /> :
                                     <FileIcon className="w-5 h-5" strokeWidth={1.5} />}
                                </span>
                                {editingId === file.id ? (
                                    <input 
                                        type="text" 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleRename('file')}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename('file')}
                                        className="border-b border-black outline-none px-1 w-full max-w-[200px] bg-transparent"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-zinc-900">{file.name}</span>
                                )}
                             </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 tabular-nums">{(file.size / 1024).toFixed(1)} KB</td>
                        <td className="px-6 py-4 text-zinc-400">{file.mimeType.split('/').pop()}</td>
                        <td className="px-6 py-4 text-zinc-400 tabular-nums">{new Date(file.updatedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onFileOpen ? onFileOpen(file) : setPreviewFile(file)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900" title="Preview/Edit"><Eye className="w-4 h-4" strokeWidth={1.5} /></button>
                                <button onClick={() => setShareFile(file)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900" title="Share"><Share2 className="w-4 h-4" strokeWidth={1.5} /></button>
                                <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900" title="Download"><Download className="w-4 h-4" strokeWidth={1.5} /></button>
                                <button onClick={() => startRename(file.id, file.name)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900" title="Rename"><Pencil className="w-4 h-4" strokeWidth={1.5} /></button>
                                <button onClick={() => handleDeleteFile(file)} className="p-1.5 hover:bg-red-50 rounded text-zinc-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
                            </div>
                        </td>
                    </tr>
                ))}

                {files.length === 0 && folders.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-24 text-zinc-400">
                            <div className="flex flex-col items-center justify-center">
                                <Folder className="w-8 h-8 mb-3 text-zinc-200" />
                                <p>This folder is empty</p>
                            </div>
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