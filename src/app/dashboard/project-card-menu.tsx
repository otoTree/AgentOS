'use client';

import { useState } from 'react';
import { deleteProject, updateProjectMetadata } from '@/app/actions';
import { toast } from '@/components/ui/sonner';

interface ProjectCardMenuProps {
  projectId: string;
  projectName: string;
  projectDescription?: string | null;
  projectAvatar?: string | null;
}

export default function ProjectCardMenu({ projectId, projectName, projectDescription, projectAvatar }: ProjectCardMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const [newDescription, setNewDescription] = useState(projectDescription || '');
  const [newAvatar, setNewAvatar] = useState(projectAvatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to project page
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await deleteProject(projectId);
      } catch (error: any) {
        toast.error('Failed to delete project: ' + error.message);
        setIsDeleting(false);
      }
    }
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setIsRenameOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
          toast.error("File size must be less than 5MB");
          return;
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'project');

      try {
          const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');

          const data = await response.json();
          setNewAvatar(data.url);
      } catch (error) {
          console.error(error);
          toast.error("Failed to upload image");
      } finally {
          setIsUploading(false);
      }
  };

  const handleRenameSave = async () => {
    setIsSaving(true);
    try {
      await updateProjectMetadata(projectId, newName, newDescription, newAvatar);
      setIsRenameOpen(false);
    } catch (error: any) {
      toast.error('Failed to update project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
        title="Project Options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-md shadow-md z-20 overflow-hidden">
            <button
              onClick={handleRenameClick}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </>
      )}

      {/* Rename Dialog */}
      {isRenameOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Project Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Avatar</label>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden border shrink-0">
                        {newAvatar ? (
                            <img src={newAvatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-2xl text-muted-foreground">?</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                         <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {isUploading ? 'Uploading...' : 'Upload new avatar (Max 5MB)'}
                        </p>
                    </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenameOpen(false); }}
                className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRenameSave(); }}
                disabled={isSaving || !newName.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}