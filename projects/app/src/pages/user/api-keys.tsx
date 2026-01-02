import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@agentos/web/components/ui/card';
import { Input } from '@agentos/web/components/ui/input';
import { Label } from '@agentos/web/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@agentos/web/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import { toast } from '@agentos/web/components/ui/sonner';

type ApiKey = {
    id: string;
    name: string;
    key: string; 
    createdAt: string;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/user/api-keys');
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/user/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (!res.ok) throw new Error('Failed to create key');
            const newKey = await res.json();
            setKeys([newKey, ...keys]);
            setCreateOpen(false);
            setNewName('');
            toast.success('API Key created');
        } catch {
            toast.error('Failed to create API Key');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/user/api-keys?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setKeys(keys.filter(k => k.id !== id));
            toast.success('API Key deleted');
        } catch {
            toast.error('Failed to delete API Key');
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Key className="w-8 h-8" />
                        API Keys
                    </h1>
                    <p className="text-muted-foreground">Manage your personal API keys for accessing AgentOS services programmatically.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input 
                                    placeholder="e.g. My App Token" 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)} 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your API Keys</CardTitle>
                    <CardDescription>These keys allow access to your private skills and other resources.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading...</div>
                    ) : keys.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">No API keys found. Create one to get started.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                                    {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                                                </code>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    onClick={() => copyToClipboard(key.key, key.id)}
                                                >
                                                    {copiedId === key.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(key.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
