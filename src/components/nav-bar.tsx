'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="border-b bg-card text-card-foreground shadow-sm mb-8">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/agent" className="font-bold text-xl tracking-tight">
            AgentOS
          </Link>
        <div className="hidden md:flex items-center gap-1">
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
