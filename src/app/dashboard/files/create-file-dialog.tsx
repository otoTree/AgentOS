"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}

export function CreateFileDialog({ open, onOpenChange, onSubmit }: CreateFileDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      // Focus input after a small delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create file");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Create New File</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">File Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., notes.md, script.js"
              className="w-full border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported types: .txt, .md, .json, .js, .ts, .py, .html, .css, etc.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}