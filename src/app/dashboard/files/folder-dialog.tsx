"use client";

import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}

export function FolderDialog({ open, onOpenChange, onSubmit }: FolderDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      setName("");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-sm border" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Create New Folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Folder Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Documents"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}