import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  HardDrive, 
  Layout, 
  Terminal, 
  Globe, 
  Wrench, 
  Mail 
} from "lucide-react";
import { FeatureCard } from "@/components/landing/feature-card";
import { Hero } from "@/components/landing/hero";
import { LandingHeader } from "@/components/landing/landing-header";
import { BackgroundEffects } from "@/components/landing/background-effects";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/agent");
  }

  const features = [
    {
      icon: HardDrive,
      title: "File System Integration",
      description: "Native file system support allowing agents to read, write, and manage files seamlessly within the environment.",
      iconClassName: "text-blue-500",
      iconBgClassName: "bg-blue-500/10"
    },
    {
      icon: Layout,
      title: "Dedicated Workspace",
      description: "Isolated workspaces for each agent ensuring context preservation and secure execution boundaries.",
      iconClassName: "text-purple-500",
      iconBgClassName: "bg-purple-500/10"
    },
    {
      icon: Terminal,
      title: "Autonomous Coding",
      description: "Empower agents to write, debug, and execute code autonomously to solve complex engineering tasks.",
      iconClassName: "text-green-500",
      iconBgClassName: "bg-green-500/10"
    },
    {
      icon: Globe,
      title: "Global File Management",
      description: "Centralized control over all agent assets, ensuring easy access and organization across projects.",
      iconClassName: "text-orange-500",
      iconBgClassName: "bg-orange-500/10"
    },
    {
      icon: Wrench,
      title: "Tool Invocation",
      description: "Seamless capability for agents to call external tools and APIs to extend their functionality.",
      iconClassName: "text-red-500",
      iconBgClassName: "bg-red-500/10"
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Built-in email fetching and processing, allowing agents to communicate and react to external messages.",
      iconClassName: "text-cyan-500",
      iconBgClassName: "bg-cyan-500/10"
    }
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-background text-foreground overflow-hidden relative">
      
      <LandingHeader />

      <Hero />

      <BackgroundEffects />

      <div className="mb-32 grid text-center lg:max-w-6xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left mt-32 gap-8">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            {...feature}
          />
        ))}
      </div>
    </main>
  );
}
