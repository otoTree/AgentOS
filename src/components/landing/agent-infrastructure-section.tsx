"use client";

import { 
  Folder, 
  Mail, 
  Globe, 
  Table, 
  Database, 
  AppWindow, 
  Workflow 
} from "lucide-react";
import { FeatureCard } from "@/components/landing/feature-card";
import { motion } from "framer-motion";

export function AgentInfrastructureSection() {
  const tools = [
    {
      icon: Folder,
      title: "Native File System",
      description: "Direct read/write access to local files, enabling agents to manage project assets and codebases seamlessly.",
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Full email client capabilities for agents to communicate, handle notifications, and process inbound messages.",
    },
    {
      icon: Globe,
      title: "Web Browser",
      description: "Headless browser integration with session management, allowing agents to navigate and interact with web applications.",
    },
    {
      icon: Table,
      title: "Data Tables",
      description: "Structured data visualization and manipulation tools for handling complex datasets and records.",
    },
    {
      icon: Database,
      title: "Smart Query",
      description: "Natural language interface for database operations, simplifying data retrieval and analysis.",
    },
    {
      icon: AppWindow,
      title: "Workbench",
      description: "Integrated development environment for code execution, debugging, and application building.",
    },
    {
      icon: Workflow,
      title: "SOP Agent",
      description: "Workflow automation engine for executing Standard Operating Procedures and complex multi-step tasks.",
    }
  ];

  return (
    <section className="w-full max-w-7xl px-6 py-24">
      <div className="mb-16 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-serif font-medium text-black mb-4"
        >
          Agent Native Infrastructure
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-lg text-black/60 max-w-2xl mx-auto"
        >
          Built-in capabilities designed to empower agents with the tools they need to operate autonomously and effectively.
        </motion.p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool, index) => (
          <FeatureCard 
            key={index}
            index={index}
            {...tool}
          />
        ))}
      </div>
    </section>
  );
}
