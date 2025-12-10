import Link from "next/link";

export function Hero() {
  return (
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
                    Started
                 </Link>
                 <Link
                    href="https://github.com"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
                >
                    Documentation
                 </Link>
            </div>
        </div>
      </div>
  );
}
