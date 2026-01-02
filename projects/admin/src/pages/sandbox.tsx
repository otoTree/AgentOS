import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Button,
  Input,
  Textarea
} from '@agentos/web';
import { Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';

export default function SandboxPage() {
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newPackage, setNewPackage] = useState('');
  const [error, setError] = useState('');

  // Config State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null);
  const [domainsInput, setDomainsInput] = useState('');
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    fetchDependencies();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch('/api/admin/sandbox/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data?.network?.allowedDomains) {
            setDomainsInput(data.network.allowedDomains.join('\n'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch config', err);
      setError('Failed to fetch config');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleUpdateDomains = async () => {
    if (!confirm('Updating allowed domains will reset the sandbox. Continue?')) return;
    
    setProcessing(true);
    try {
        const domains = domainsInput.split('\n').map(d => d.trim()).filter(Boolean);
        const res = await fetch('/api/admin/sandbox/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowedDomains: domains }),
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update config');
        }
        
        const newConfig = await res.json();
        setConfig(newConfig);
        if (newConfig?.network?.allowedDomains) {
            setDomainsInput(newConfig.network.allowedDomains.join('\n'));
        }
        alert('Sandbox configuration updated successfully.');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Error updating config: ${message}`);
    } finally {
        setProcessing(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/sandbox/dependencies');
      const data = await res.json();
      if (data.dependencies) {
        setDependencies(data.dependencies);
      }
    } catch {
      setError('Failed to fetch dependencies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPackage = async () => {
    if (!newPackage.trim()) return;
    const pkgName = newPackage.trim();
    
    // Check if simple name exists in dependencies (naive check)
    // Dependencies are "name==version", user might input "name" or "name==ver"
    const simpleName = pkgName.split(/[=<>~]/)[0];
    const exists = dependencies.some(d => d.startsWith(simpleName + '==') || d === simpleName);
    
    if (exists) {
        if (!confirm(`Package ${simpleName} seems to be installed. Install anyway (to update/change version)?`)) {
            return;
        }
    }

    setProcessing(true);
    try {
        const res = await fetch('/api/admin/sandbox/dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'install', packages: [pkgName] }),
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to install');
        }
        
        setNewPackage('');
        await fetchDependencies(); // Refresh list
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Error installing package: ${message}`);
    } finally {
        setProcessing(false);
    }
  };

  const handleRemovePackage = async (pkgStr: string) => {
    // pkgStr is like "numpy==1.21.0"
    const pkgName = pkgStr.split('==')[0]; // Simple split for pip list format
    
    if (!confirm(`Are you sure you want to uninstall ${pkgName}?`)) return;

    setProcessing(true);
    try {
        const res = await fetch('/api/admin/sandbox/dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'uninstall', packages: [pkgName] }),
        });
        
        if (!res.ok) {
             const err = await res.json();
             throw new Error(err.error || 'Failed to uninstall');
        }
        
        await fetchDependencies(); // Refresh list
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Error uninstalling package: ${message}`);
    } finally {
        setProcessing(false);
    }
  };

  if (loading && dependencies.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sandbox Dependencies</h1>
            <p className="text-muted-foreground">
              Manage pre-installed Python packages available in the Skill execution environment.
            </p>
          </div>
          {/* Status Indicator */}
          {processing && (
              <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
              </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add New Package</CardTitle>
            <CardDescription>Enter the pip package name (e.g. pandas==2.0.0 or just pandas)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. requests" 
                value={newPackage}
                onChange={(e) => setNewPackage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !processing && handleAddPackage()}
                disabled={processing}
              />
              <Button onClick={handleAddPackage} variant="secondary" disabled={processing || !newPackage.trim()}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Install
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installed Packages ({dependencies.length})</CardTitle>
            <CardDescription>Current environment packages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dependencies.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No packages installed.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {dependencies.map((pkg) => (
                    <div key={pkg} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                      <span className="font-mono text-sm truncate mr-2" title={pkg}>{pkg}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemovePackage(pkg)}
                        disabled={processing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Configuration</CardTitle>
            <CardDescription>
              Configure allowed domains for the sandbox environment. 
              <span className="text-destructive font-medium ml-1">
                Warning: Updating this list will restart the sandbox service.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Allowed Domains (One per line)</label>
                <Textarea 
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  rows={6}
                  placeholder="e.g. google.com&#10;*.github.com"
                  className="font-mono text-sm"
                />
              </div>

              {config?.network?.deniedDomains && config.network.deniedDomains.length > 0 && (
                <div>
                    <label className="text-sm font-medium mb-1.5 block">Denied Domains (Read-only)</label>
                    <div className="p-3 bg-muted rounded-md text-sm font-mono text-muted-foreground break-all">
                        {config.network.deniedDomains.join(', ')}
                    </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleUpdateDomains} disabled={processing || configLoading}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Update Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
