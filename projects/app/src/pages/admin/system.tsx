import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agentos/web/components/ui/card';
import { Switch } from '@agentos/web/components/ui/switch';
import { Label } from '@agentos/web/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function SystemSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [multiTeamMode, setMultiTeamMode] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/system/settings')
            .then(async (res) => {
                if (res.status === 403) {
                    setError('Access Denied: You are not Root.');
                    return;
                }
                if (!res.ok) throw new Error('Failed to load settings');
                const data = await res.json();
                setMultiTeamMode(data.multi_team_mode);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = async (checked: boolean) => {
        setMultiTeamMode(checked); // Optimistic update
        try {
            const res = await fetch('/api/admin/system/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ multi_team_mode: checked })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }
        } catch (e: unknown) {
            setMultiTeamMode(!checked); // Revert
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            alert(errorMessage);
        }
    };

    if (error) {
        return (
            <AdminLayout>
                <div className="text-red-500 p-4">{error}</div>
            </AdminLayout>
        );
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">System Settings</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Team Configuration</CardTitle>
                        <CardDescription>Manage how users are assigned to teams.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="multi-team-mode" className="font-medium">Multi-Team Mode</Label>
                                <span className="text-sm text-muted-foreground">
                                    {multiTeamMode 
                                        ? "New users create their own personal team." 
                                        : "New users are automatically added to the Root Team."}
                                </span>
                            </div>
                            <Switch 
                                id="multi-team-mode" 
                                checked={multiTeamMode}
                                onCheckedChange={handleToggle}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
