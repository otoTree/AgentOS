import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "./auth-form";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/agent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FAFAFA] text-black overflow-hidden relative selection:bg-black/10 selection:text-black">
      {/* Navigation */}
      <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight hover:opacity-70 transition-opacity"
        >
          AgentOS
        </Link>
      </div>

      <div className="z-10 w-full max-w-[380px] flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif font-medium tracking-tight text-black">
            Welcome Back
          </h2>
          <p className="text-sm text-black/50 font-light">
            Enter your credentials to access the workspace
          </p>
        </div>

        {/* Auth Form Component */}
        <AuthForm />

        <div className="text-center text-xs text-black/30 font-light mt-8">
          By continuing, you agree to our Terms of Service <br/>
          and Privacy Policy.
        </div>
      </div>
    </main>
  );
}
