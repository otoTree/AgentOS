'use client';

import { useState, useEffect } from 'react';

interface ToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
  title?: string;
  isSaving?: boolean;
}

export default function ToolDialog({ 
    isOpen, 
    onClose, 
    onSave, 
    initialName = '', 
    initialDescription = '', 
    title = 'Tool Details',
    isSaving = false
}: ToolDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  // Reset state when dialog opens/closes or initial values change
  useEffect(() => {
      if (isOpen) {
        setName(initialName);
        setDescription(initialDescription);
      }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(name, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Tool Name"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              placeholder="What does this tool do?"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                disabled={isSaving}
            >
                Cancel
            </button>
            <button 
                type="submit" 
                disabled={isSaving || !name.trim()} 
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
                {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}