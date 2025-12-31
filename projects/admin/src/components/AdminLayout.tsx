import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { 
  Users, 
  Settings, 
  Box, 
  LayoutDashboard, 
  LogOut,
  Menu,
  Code2
} from 'lucide-react';
import { 
  Button, 
  ScrollArea,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@agentos/web';
import { cn } from '@agentos/web/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Skills', href: '/skills', icon: Code2 },
  { name: 'Sandbox', href: '/sandbox', icon: Box },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-muted/10">
        <div className="p-6 flex items-center gap-2 font-bold text-xl border-b bg-background">
          <Box className="w-6 h-6 text-primary" />
          <span>AgentOS Admin</span>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t bg-background space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="w-9 h-9 border">
              <AvatarImage src={session?.user?.image || ''} />
              <AvatarFallback>{session?.user?.name?.[0] || 'A'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
             </Button>
             <nav className="flex items-center text-sm text-muted-foreground">
                <span className="capitalize">{router.pathname === '/' ? 'Dashboard' : router.pathname.split('/')[1]}</span>
             </nav>
          </div>
          <div className="flex items-center gap-4">
             {/* Additional header items like notifications could go here */}
          </div>
        </header>

        {/* Page Body */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
