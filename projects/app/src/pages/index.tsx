import React from 'react';
import { DEFAULT_CONFIG } from '@agentos/global';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@agentos/web/components/ui/card';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { LayoutDashboard, Users, FileText, Settings, Bot, ArrowRight, LogOut } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 dark:bg-slate-950">
        <Card className="w-[400px] shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to {DEFAULT_CONFIG.name}</CardTitle>
            <CardDescription>Version {DEFAULT_CONFIG.version}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              AgentOS is a powerful AI Agent building platform.
            </p>
            <p>
              Please sign in to access your workspace, manage teams, and configure AI models.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" size="lg" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/register')}>
              Create Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Bot className="w-8 h-8" />
          AgentOS
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-right hidden md:block">
            <div className="font-medium">{session.user?.name || 'User'}</div>
            <div className="text-muted-foreground text-xs">{session.user?.email}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your infrastructure and resources.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module: AI Models */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/models')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Model Configuration
              </CardTitle>
              <CardDescription>Manage AI providers and models</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure OpenAI, Anthropic, or Local LLM endpoints. Set API keys and default parameters for your agents.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full justify-between group">
                Configure
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* Module: Team & RBAC */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/team')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Team & Access
              </CardTitle>
              <CardDescription>Manage members and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create teams, invite members, and assign roles (Owner, Admin, Member). Control access permissions.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full justify-between group">
                Manage Team
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* Module: Files & Storage */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/team')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                File System
              </CardTitle>
              <CardDescription>Knowledge base storage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload and manage files for RAG knowledge bases. Supported by S3-compatible storage.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full justify-between group">
                Browse Files
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* Placeholder: Future Modules */}
          <Card className="opacity-60 border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" />
                Workbench (Coming Soon)
              </CardTitle>
              <CardDescription>Agent Builder & Workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visual workflow builder and agent orchestration will be available in the next phase.
              </p>
            </CardContent>
            <CardFooter>
               <Button variant="ghost" disabled className="w-full justify-start">
                Planned
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
