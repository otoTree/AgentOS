import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Hero } from "@/components/landing/hero";
import { LandingHeader } from "@/components/landing/landing-header";
import { AgentInfrastructureSection } from "@/components/landing/agent-infrastructure-section";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/agent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#FAFAFA] text-black selection:bg-black/10 selection:text-black">
      
      <LandingHeader />

      <Hero />

      <AgentInfrastructureSection />
      
      <footer className="w-full py-8 text-center text-sm text-black/40 border-t border-black/5 mt-auto">
        <p>© 2024 AgentOS. Eastern Editorial Minimalism.</p>
      </footer>
    </main>
  );
}
