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
  const [saving, setSaving] = useState(false);
  const [newPackage, setNewPackage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const res = await fetch('/api/admin/sandbox/dependencies');
      const data = await res.json();
      if (data.dependencies) {
        setDependencies(data.dependencies);
      }
    } catch (err) {
      setError('Failed to fetch dependencies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPackage = () => {
    if (!newPackage.trim()) return;
    if (dependencies.includes(newPackage.trim())) {
        alert('Package already exists');
        return;
    }
    setDependencies([...dependencies, newPackage.trim()]);
    setNewPackage('');
  };

  const handleRemovePackage = (pkg: string) => {
    setDependencies(dependencies.filter(p => p !== pkg));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/sandbox/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependencies }),
      });
      if (res.ok) {
        alert('Dependencies saved successfully');
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Error saving dependencies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
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
            <CardDescription>Enter the pip package name (e.g., pandas==2.0.0)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. requests" 
                value={newPackage}
                onChange={(e) => setNewPackage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPackage()}
              />
              <Button onClick={handleAddPackage} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installed Packages</CardTitle>
            <CardDescription>Current requirements.txt content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dependencies.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No packages installed.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {dependencies.map((pkg) => (
                    <div key={pkg} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                      <span className="font-mono text-sm">{pkg}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePackage(pkg)}
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
      </div>
    </AdminLayout>
  );
}
