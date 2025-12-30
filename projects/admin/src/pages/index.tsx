import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@agentos/web';
import { Users, Box, Settings, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [statsData, setStatsData] = useState({ userCount: '...', pkgCount: '...', status: '...' });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStatsData(data))
      .catch(() => setStatsData({ userCount: 'Err', pkgCount: 'Err', status: 'Down' }));
  }, []);

  const stats = [
    { name: 'Total Users', value: statsData.userCount, icon: Users, description: 'Registered platform users', href: '/users' },
    { name: 'Sandbox Packages', value: statsData.pkgCount, icon: Box, description: 'Pre-installed pip dependencies', href: '/sandbox' },
    { name: 'System Status', value: statsData.status, icon: Activity, description: 'All services running', href: '/settings' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome to AgentOS Super Admin Panel. Manage your platform settings and users here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.name}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Commonly used administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Link href="/users">
               <div className="p-4 border rounded-lg hover:bg-muted transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-medium">Manage Users</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             </Link>
             <Link href="/sandbox">
               <div className="p-4 border rounded-lg hover:bg-muted transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-primary" />
                    <span className="font-medium">Sandbox Env</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             </Link>
             <Link href="/settings">
               <div className="p-4 border rounded-lg hover:bg-muted transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-primary" />
                    <span className="font-medium">System Mode</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
