import React from 'react';
import { DEFAULT_CONFIG } from '@agentos/global';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@agentos/web/components/ui/card';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Bot,
  ArrowRight,
  LogOut,
  Key,
  Database,
  Shield,
  Plus,
  Upload,
  Sparkles,
  Cpu
} from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Loading State
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Not Logged In State
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 dark:bg-slate-950">
        <Card className="w-[400px] shadow-lg border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to {DEFAULT_CONFIG.name}</CardTitle>
            <CardDescription>Version {DEFAULT_CONFIG.version}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              AgentOS is your enterprise-grade AI Agent building platform.
            </p>
            <p>
              Sign in to orchestrate workflows, manage knowledge bases, and deploy intelligent agents.
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

  // Logged In Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          AgentOS
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-right hidden md:block">
            <div className="font-medium text-slate-900 dark:text-slate-100">{session.user?.name || 'User'}</div>
            <div className="text-muted-foreground text-xs">{session.user?.email}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign out">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">
              Welcome back, {session.user?.name?.split(' ')[0] || 'Developer'}
            </h1>
            <p className="text-muted-foreground text-lg">
              Ready to build your next intelligent agent?
            </p>
          </div>
          <div className="flex gap-3">
             <Button onClick={() => router.push('/workbench')} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              New Skill
            </Button>
            <Button variant="outline" onClick={() => router.push('/dataset')} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* Core Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Workbench - Primary */}
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/workbench')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  Workbench
                </CardTitle>
                <CardDescription>AI Agent Builder & Workflow Engine</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Design, test, and deploy AI skills using our visual builder. Orchestrate complex tasks with natural language prompts and structured workflows.
                </p>
                <div className="flex gap-2">
                   <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Prompt Engineering</span>
                   <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Testing</span>
                   <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Deployment</span>
                </div>
              </CardContent>
              <CardFooter>
                 <div className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Go to Workbench <ArrowRight className="w-4 h-4" />
                 </div>
              </CardFooter>
            </Card>

            {/* File System - Primary */}
            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/dataset')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                   <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  File System
                </CardTitle>
                <CardDescription>File Storage & Knowledge Base</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                   Upload, organize, and manage your files. These files can be used as knowledge bases for your AI agents to provide accurate context.
                </p>
                 <div className="flex gap-2">
                   <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">File Management</span>
                   <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Vector Search</span>
                </div>
              </CardContent>
              <CardFooter>
                 <div className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Manage Files <ArrowRight className="w-4 h-4" />
                 </div>
              </CardFooter>
            </Card>
        </div>

        <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-slate-100">Management & Settings</h2>
        
        {/* Secondary Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Team */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/team')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-green-500" />
                Team & Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage team members, roles, and permissions.
              </p>
            </CardContent>
          </Card>

          {/* Models */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/models')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="w-5 h-5 text-purple-500" />
                Model Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure LLM endpoints (OpenAI, Anthropic, Local).
              </p>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/user/api-keys')}>
             <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="w-5 h-5 text-yellow-500" />
                API Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage developer keys for external API access.
              </p>
            </CardContent>
          </Card>

          {/* System */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system')}>
             <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5 text-slate-500" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Global configuration and platform preferences.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
