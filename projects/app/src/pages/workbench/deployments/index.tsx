import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@agentos/web/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@agentos/web/components/ui/table';
import { Rocket, Trash2, ExternalLink, RefreshCw, Play } from 'lucide-react';
import { toast } from '@agentos/web/components/ui/sonner';
import { Badge } from '@agentos/web/components/ui/badge';
import { RunSkillDialog } from '@/components/workbench/RunSkillDialog';

type Deployment = {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    serviceId?: string; // Skill ID
    skillName?: string;
    skillEmoji?: string;
    url?: string;
    type?: string; // private/public
}

export default function DeploymentsPage() {
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Run Dialog State
    const [runDialogOpen, setRunDialogOpen] = useState(false);
    const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

    useEffect(() => {
        fetchDeployments();
    }, []);

    const fetchDeployments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workbench/deployments');
            if (res.ok) {
                const data = await res.json();
                setDeployments(Array.isArray(data) ? data : []);
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch deployments');
            }
        } catch (error) {
            console.error(error);
            toast.error((error as Error).message || 'Failed to load deployments');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this deployment? This will stop the running service.')) return;
        try {
            const res = await fetch(`/api/workbench/deployments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setDeployments(deployments.filter(d => d.id !== id));
            toast.success('Deployment deleted');
        } catch {
            toast.error('Failed to delete deployment');
        }
    };

    const handleRun = async (input: Record<string, unknown>) => {
        if (!selectedDeployment) return;
        
        const res = await fetch(`/api/workbench/deployments/${selectedDeployment.id}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Execution failed');
        }
        
        return await res.json();
    };

    const openRunDialog = (deployment: Deployment) => {
        setSelectedDeployment(deployment);
        setRunDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'running': return 'default'; // primary/black
            case 'stopped': return 'secondary';
            case 'failed': return 'destructive';
            case 'pending': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Rocket className="w-8 h-8" />
                        Deployments
                    </h1>
                    <p className="text-muted-foreground">Manage your active skill deployments.</p>
                </div>
                <Button variant="outline" onClick={fetchDeployments}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Deployments</CardTitle>
                    <CardDescription>Monitor and manage your running services.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading...</div>
                    ) : deployments.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">No active deployments found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deployments.map((deploy) => (
                                    <TableRow key={deploy.id}>
                                        <TableCell className="font-mono text-xs">{deploy.id}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{deploy.type || 'Unknown'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(deploy.status) as "default" | "secondary" | "destructive" | "outline"}>
                                                {deploy.status || 'Unknown'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(deploy.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    title="Run Service"
                                                    onClick={() => openRunDialog(deploy)}
                                                >
                                                    <Play className="w-4 h-4 text-green-600" />
                                                </Button>
                                                {deploy.url && (
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={deploy.url} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(deploy.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selectedDeployment && (
                <RunSkillDialog
                    open={runDialogOpen}
                    onOpenChange={setRunDialogOpen}
                    skillId={selectedDeployment.serviceId || ''}
                    skillName={selectedDeployment.skillName || 'Deployment'}
                    onRun={handleRun}
                />
            )}
        </AdminLayout>
    );
}
