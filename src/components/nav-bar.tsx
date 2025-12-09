'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="border-b bg-card text-card-foreground shadow-sm mb-8">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-bold text-xl tracking-tight">
            AgentOS
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/email"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard/email')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Email
            </Link>
            <Link
              href="/workbench"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/workbench')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Workbench
            </Link>
            <Link
              href="/marketplace"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/marketplace')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Marketplace
            </Link>
            <Link
              href="/agent"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/agent')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Agent Chat
            </Link>
            <Link
              href="/sopAgent"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/sopAgent')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              SOP Agent
            </Link>
            <Link
              href="/audit"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/audit')
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Audit
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/profile"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}