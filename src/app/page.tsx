import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  HardDrive, 
  Layout, 
  Terminal, 
  Globe, 
  Wrench, 
  Mail 
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-background text-foreground overflow-hidden relative">
      
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex mb-12">
        <div className="fixed left-0 top-0 flex w-full justify-center border-b bg-background/80 backdrop-blur-md pb-6 pt-8 lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-card lg:p-4">
          <code className="font-mono font-bold text-primary">AgentOS v1.0</code>
        </div>
      </div>

      <div className="relative flex place-items-center z-10">
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-gray-900/10 hover:ring-gray-900/20 dark:ring-white/10 dark:hover:ring-white/20">
              <span className="font-semibold text-primary">The Next Gen AI Infrastructure</span>
              <span className="h-4 w-px bg-gray-900/10 dark:bg-white/10 mx-2"></span>
              <span className="inline-flex items-center gap-1">
                 Explore Features <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Your Complete <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500">Agent Operating System</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl text-center leading-relaxed">
                AgentOS provides the essential infrastructure for autonomous agents: File Systems, Workspaces, Coding Capabilities, Global Management, Tool Execution, and Email Integration.
            </p>
            
            <div className="mt-8 flex items-center gap-4">
                 <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shadow-lg hover:shadow-primary/25"
                >
                    Launch Console
                 </Link>
                 <Link
                    href="https://github.com" // Placeholder for docs or repo
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
                >
                    Documentation
                 </Link>
            </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-6xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left mt-32 gap-8">
        
        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-blue-500/10 p-3 text-blue-500">
            <HardDrive className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            File System Integration
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Native file system support allowing agents to read, write, and manage files seamlessly within the environment.
          </p>
        </div>

        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-purple-500/10 p-3 text-purple-500">
            <Layout className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            Dedicated Workspace
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Isolated workspaces for each agent ensuring context preservation and secure execution boundaries.
          </p>
        </div>

        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-green-500/10 p-3 text-green-500">
            <Terminal className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            Autonomous Coding
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Empower agents to write, debug, and execute code autonomously to solve complex engineering tasks.
          </p>
        </div>

        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-orange-500/10 p-3 text-orange-500">
            <Globe className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            Global File Management
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Centralized control over all agent assets, ensuring easy access and organization across projects.
          </p>
        </div>

        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-red-500/10 p-3 text-red-500">
            <Wrench className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            Tool Invocation
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seamless capability for agents to call external tools and APIs to extend their functionality.
          </p>
        </div>

        <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
          <div className="mb-4 inline-block rounded-lg bg-cyan-500/10 p-3 text-cyan-500">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
            Email Integration
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Built-in email fetching and processing, allowing agents to communicate and react to external messages.
          </p>
        </div>

      </div>
    </main>
  );
}
