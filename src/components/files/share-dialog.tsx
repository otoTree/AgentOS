"use client";

import { File } from "@prisma/client";
import { useState } from "react";
import { shareFile } from "@/app/file-actions";
import { X } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";

export function ShareDialog({ 
  file, 
  open, 
  onOpenChange 
}: { 
  file: File; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);

  const handleShareUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await shareFile(file.id, email);
      setMessage({ type: "success", text: "Shared successfully!" });
      setEmail("");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to share. User may not exist." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublicLink = async () => {
    setLoading(true);
    try {
      const result = await shareFile(file.id, undefined, true);
      if (result?.token) {
        const url = `${window.location.origin}/share/${result.token}`;
        setPublicLink(url);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create public link." });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Share &quot;{file.name}&quot;</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <DialogDescription>
          Share &quot;{file.name}&quot; with others via a public link.
        </DialogDescription>

        {message && (
          <div className={`p-2 mb-4 rounded text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Share with User */}
          <div>
            <h3 className="text-sm font-medium mb-2">Share with User</h3>
            <form onSubmit={handleShareUser} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="flex-1 p-2 border rounded text-sm"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Share
              </button>
            </form>
          </div>

          <div className="border-t pt-4">
             <h3 className="text-sm font-medium mb-2">Public Link</h3>
             {publicLink ? (
               <div className="space-y-2">
                 <input 
                   readOnly 
                   value={publicLink} 
                   className="w-full p-2 bg-muted rounded text-sm" 
                   onClick={(e) => e.currentTarget.select()}
                 />
                 <div className="text-xs text-muted-foreground">
                   Anyone with this link can view this file.
                 </div>
               </div>
             ) : (
                <button 
                  onClick={handleCreatePublicLink}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80"
                >
                  Generate Public Link
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}