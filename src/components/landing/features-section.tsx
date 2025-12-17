"use client";

import { 
  HardDrive, 
  Layout, 
  Terminal, 
  Globe, 
  Wrench, 
  Mail 
} from "lucide-react";
import { FeatureCard } from "@/components/landing/feature-card";

export function FeaturesSection() {
  const features = [
    {
      icon: HardDrive,
      title: "File System Integration",
      description: "Native file system support allowing agents to read, write, and manage files seamlessly within the environment.",
    },
    {
      icon: Layout,
      title: "Dedicated Workspace",
      description: "Isolated workspaces for each agent ensuring context preservation and secure execution boundaries.",
    },
    {
      icon: Terminal,
      title: "Autonomous Coding",
      description: "Empower agents to write, debug, and execute code autonomously to solve complex engineering tasks.",
    },
    {
      icon: Globe,
      title: "Global File Management",
      description: "Centralized control over all agent assets, ensuring easy access and organization across projects.",
    },
    {
      icon: Wrench,
      title: "Tool Invocation",
      description: "Seamless capability for agents to call external tools and APIs to extend their functionality.",
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Built-in email fetching and processing, allowing agents to communicate and react to external messages.",
    }
  ];

  return (
    <section className="w-full max-w-7xl px-6 pb-32">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            index={index}
            {...feature}
          />
        ))}
      </div>
    </section>
  );
}
