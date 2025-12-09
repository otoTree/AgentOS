import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "./auth-form";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-black text-white overflow-hidden relative">
      {/* Navigation - Minimalist */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-mono font-bold text-white/80 hover:text-white transition-colors"
        >
          <span className="text-white">Agent</span>OS
        </Link>
      </div>

      {/* Background Effects - Monochrome */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-[400px] flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-4 shadow-lg shadow-white/5">
            <svg
              className="w-6 h-6 text-white"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            System Access
          </h2>
          <p className="text-sm text-gray-400">
            Initialize agent environment
          </p>
        </div>

        {/* Auth Form Component */}
        <AuthForm />

        <div className="text-center text-xs text-gray-600">
          Powered by AgentOS Kernel. <br/>
          <span className="opacity-50">v1.0.0-stable</span>
        </div>
      </div>
    </main>
  );
}