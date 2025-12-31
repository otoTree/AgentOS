import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@agentos/web/components/ui/dialog';
import { Button } from '@agentos/web/components/ui/button';
import { Input } from '@agentos/web/components/ui/input';
import { Label } from '@agentos/web/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Copy, Trash2, Plus, Lock, Globe, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@agentos/web/components/ui/sonner';

type ShareLinkDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileId: string;
    fileName: string;
}

type Share = {
    id: string;
    token: string;
    isPasswordProtected: boolean;
    createdAt: string;
    expiresAt?: string;
    viewCount: number;
    link: string;
}

export function ShareLinkDialog({ open, onOpenChange, fileId, fileName }: ShareLinkDialogProps) {
    const [shares, setShares] = useState<Share[]>([]);
    const [loading, setLoading] = useState(false);
    const [createType, setCreateType] = useState<'public' | 'password'>('public');
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);

    const loadShares = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/files/share/list?fileId=${fileId}`);
            if (res.ok) {
                const data = await res.json();
                setShares(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && fileId) {
            loadShares();
            // Reset form
            setCreateType('public');
            setPassword('');
        }
    }, [open, fileId]);

    const handleCreate = async () => {
        if (createType === 'password' && !password) {
            toast.error('Password is required');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/files/share/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId,
                    type: createType,
                    password: createType === 'password' ? password : undefined
                })
            });

            if (res.ok) {
                toast.success('Share link created');
                setPassword('');
                loadShares();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create share link');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to create share link');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this share link?')) return;
        try {
            const res = await fetch(`/api/files/share/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Share link deleted');
                loadShares();
            } else {
                toast.error('Failed to delete share link');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Link copied to clipboard');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Share File: {fileName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Create New Share */}
                    <div className="flex items-end gap-4 border-b pb-6">
                        <div className="space-y-2 flex-1">
                            <Label>Share Type</Label>
                            <Select value={createType} onValueChange={(v) => setCreateType(v as 'public' | 'password')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" /> Public Link (Direct Download)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="password">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Password Protected
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {createType === 'password' && (
                            <div className="space-y-2 flex-1">
                                <Label>Password</Label>
                                <Input 
                                    type="text" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter access password"
                                />
                            </div>
                        )}

                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Link
                        </Button>
                    </div>

                    {/* List Shares */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Active Share Links</h4>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Link</TableHead>
                                        <TableHead>Views</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shares.map(share => (
                                        <TableRow key={share.id}>
                                            <TableCell>
                                                {share.isPasswordProtected ? (
                                                    <div className="flex items-center gap-2 text-orange-600">
                                                        <Lock className="w-4 h-4" /> Protected
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-green-600">
                                                        <Globe className="w-4 h-4" /> Public
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[300px]">
                                                    <div className="truncate text-sm text-muted-foreground flex-1">
                                                        {share.link}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(share.link)}>
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>{share.viewCount}</TableCell>
                                            <TableCell>{format(new Date(share.createdAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(share.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {shares.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "No active share links"}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
