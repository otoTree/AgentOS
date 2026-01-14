import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@agentos/web/components/ui/button';

export const AdminLayout: React.FC<{ children: React.ReactNode; mainClassName?: string }> = ({ children, mainClassName }) => {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl">AgentOS Admin</Link>
          <nav className="flex gap-4">
            <Link href="/workbench" className={router.pathname.startsWith('/workbench') && !router.pathname.startsWith('/workbench/deployments') ? 'text-primary' : 'text-muted-foreground'}>Workbench</Link>
            <Link href="/workbench/deployments" className={router.pathname.startsWith('/workbench/deployments') ? 'text-primary' : 'text-muted-foreground'}>Deployments</Link>
            <Link href="/tasks" className={router.pathname.startsWith('/tasks') ? 'text-primary' : 'text-muted-foreground'}>Tasks</Link>
            <Link href="/user/api-keys" className={router.pathname.startsWith('/user/api-keys') ? 'text-primary' : 'text-muted-foreground'}>API Keys</Link>
            <Link href="/admin/models" className={router.pathname.startsWith('/admin/models') ? 'text-primary' : 'text-muted-foreground'}>Models</Link>
            <Link href="/team" className={router.pathname.startsWith('/team') ? 'text-primary' : 'text-muted-foreground'}>Team</Link>
            <Link href="/dataset" className={router.pathname.startsWith('/dataset') ? 'text-primary' : 'text-muted-foreground'}>Files</Link>
            <Link href="/admin/system" className={router.pathname.startsWith('/admin/system') ? 'text-primary' : 'text-muted-foreground'}>System</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span>{session.user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>Sign Out</Button>
        </div>
      </header>
      <main className={`flex-1 p-6 bg-muted/10 flex flex-col ${mainClassName || ''}`}>
        {children}
      </main>
    </div>
  );
};
