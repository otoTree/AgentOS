'use client';

import { useState } from "react";

interface DeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (accessType: 'PUBLIC' | 'PRIVATE', category: string) => Promise<void>;
  isDeploying: boolean;
}

const CATEGORIES = ["AI", "Data", "Web", "Tools", "Fun"];

export default function DeploymentDialog({ isOpen, onClose, onDeploy, isDeploying }: DeploymentDialogProps) {
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [category, setCategory] = useState("Tools");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border text-card-foreground" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Deploy Function</h2>
        
        <div className="space-y-6">
          {/* Access Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Access Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccessType('PUBLIC')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  accessType === 'PUBLIC' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-muted/20 border-transparent hover:bg-muted/40'
                }`}
              >
                <span className="font-semibold text-sm">Public (Marketplace)</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Listed in Marketplace, No Auth Required</span>
              </button>
              <button
                 type="button"
                onClick={() => setAccessType('PRIVATE')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  accessType === 'PRIVATE' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-muted/20 border-transparent hover:bg-muted/40'
                }`}
              >
                <span className="font-semibold text-sm">Private (Secure)</span>
                <span className="text-[10px] text-muted-foreground mt-1 text-center">Requires Your API Token, Not Listed</span>
              </button>
            </div>
          </div>

          {/* Category Selection - Only for Public (but let's ask for it always for project metadata) */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
               {accessType === 'PUBLIC' ? 'This category helps users find your project in the marketplace.' : 'Categorize your project for better organization.'}
            </p>
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-8">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            disabled={isDeploying}
          >
            Cancel
          </button>
          <button 
            onClick={() => onDeploy(accessType, category)} 
            disabled={isDeploying} 
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {isDeploying ? "Deploying..." : "Confirm Deployment"}
          </button>
        </div>
      </div>
    </div>
  );
}