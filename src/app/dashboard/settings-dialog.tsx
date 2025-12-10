'use client';

import { useState, useEffect } from 'react';
import { generateApiToken, revokeApiToken, getApiTokens } from './settings-actions';
import { ApiToken } from '@prisma/client';
import { Settings, Copy } from 'lucide-react';

interface SettingsDialogProps {
}

export default function SettingsDialog({ }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // API Tokens State
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTokens();
    }
  }, [isOpen]);

  const loadTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const data = await getApiTokens();
      setTokens(data);
    } catch (error) {
      console.error("Failed to load tokens", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!newTokenName.trim()) return;
    try {
      const newToken = await generateApiToken(newTokenName);
      setCreatedToken(newToken.token);
      setNewTokenName('');
      loadTokens();
    } catch (error: any) {
      alert('Failed to generate token: ' + error.message);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this token? Any applications using it will stop working immediately.')) return;
    try {
      await revokeApiToken(id);
      loadTokens();
    } catch (error: any) {
      alert('Failed to revoke token: ' + error.message);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1"><Settings className="w-4 h-4" /> Settings</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-2xl bg-card p-0 rounded-xl shadow-lg border overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4">
                Manage API tokens for accessing your tools programmatically.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Note: These tokens allow access to AgentOS APIs on your behalf. Keep them secret.
                </p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="text-sm font-medium mb-2">Generate New Token</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Token Name (e.g. My CLI Script)"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                  />
                  <button
                    onClick={handleGenerateToken}
                    disabled={!newTokenName.trim()}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {createdToken && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
                  <h4 className="font-bold text-sm mb-1">Token Generated!</h4>
                  <p className="text-xs mb-2">Please copy this token now. You won&apos;t be able to see it again.</p>
                  <div className="flex gap-2 items-center">
                    <code className="bg-white px-2 py-1 rounded border flex-1 overflow-x-auto text-sm font-mono">
                        {createdToken}
                    </code>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(createdToken);
                            alert('Copied to clipboard!');
                        }}
                        className="text-xs bg-green-200 hover:bg-green-300 px-2 py-1 rounded"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => setCreatedToken(null)} className="text-xs mt-2 underline">Done</button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-3">Active Tokens</h3>
                {isLoadingTokens ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Loading tokens...</div>
                ) : tokens.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        No API tokens found. Generate one to get started.
                    </div>
                ) : (
                    <div className="border rounded-lg divide-y">
                        {tokens.map(token => (
                            <div key={token.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-sm">{token.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Created: {new Date(token.createdAt).toLocaleDateString()}
                                        {token.lastUsed && ` • Last used: ${new Date(token.lastUsed).toLocaleDateString()}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevokeToken(token.id)}
                                    className="text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}