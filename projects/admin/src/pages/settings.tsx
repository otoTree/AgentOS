import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Switch,
  Label
} from '@agentos/web';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [multiTeamMode, setMultiTeamMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/system/settings');
      if (res.ok) {
        const data = await res.json();
        setMultiTeamMode(data.multi_team_mode);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (err) {
      setError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMultiTeam = async (checked: boolean) => {
    setMultiTeamMode(checked);
    try {
      const res = await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multi_team_mode: checked }),
      });
      if (!res.ok) {
        throw new Error('Update failed');
      }
    } catch (err) {
      alert('Failed to update multi-team mode');
      setMultiTeamMode(!checked); // Revert
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure global platform behavior and team structures.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Team Configuration</CardTitle>
            <CardDescription>
              Control how teams are created and managed for new users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="multi-team-mode" className="text-base font-semibold">
                  Multi-Team Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  {multiTeamMode 
                    ? "Enabled: Users can create and belong to multiple teams." 
                    : "Disabled: All users belong to a single shared root team."}
                </p>
              </div>
              <Switch 
                id="multi-team-mode" 
                checked={multiTeamMode}
                onCheckedChange={handleToggleMultiTeam}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Info</CardTitle>
            <CardDescription>Global configuration details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 text-sm">
                <span className="text-muted-foreground">Database Status</span>
                <span className="text-green-600 font-medium flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-green-600" /> Connected
                </span>
             </div>
             <div className="grid grid-cols-2 text-sm">
                <span className="text-muted-foreground">Root Email</span>
                <span className="font-mono">{process.env.ROOT_EMAIL || 'root@agentos.local'}</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
