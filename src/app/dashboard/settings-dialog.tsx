'use client';

import { useState, useEffect } from 'react';
import { updateUserOpenAIConfig, generateApiToken, revokeApiToken, getApiTokens } from './settings-actions';
import { ApiToken } from '@prisma/client';
import { Settings, Copy } from 'lucide-react';

interface SettingsDialogProps {
  initialApiKey?: string | null;
  initialBaseUrl?: string | null;
  initialModel?: string | null;
}

export default function SettingsDialog({ initialApiKey, initialBaseUrl, initialModel }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tokens'>('general');
  
  // General Settings State
  const [apiKey, setApiKey] = useState(initialApiKey || '');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl || '');
  const [model, setModel] = useState(initialModel || '');
  const [isSaving, setIsSaving] = useState(false);

  // API Tokens State
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'tokens') {
      loadTokens();
    }
  }, [isOpen, activeTab]);

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

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await updateUserOpenAIConfig(apiKey, baseUrl, model);
      setIsOpen(false);
      alert('Settings saved successfully!');
    } catch (error: any) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
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

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('tokens')}
          >
            API Tokens
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' ? (
            <div className="space-y-4 max-w-md mx-auto">
               <div>
                <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the system default key.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">OpenAI Base URL</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Useful for proxies or other compatible providers.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="gpt-4o"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Defaults to gpt-4o.
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}