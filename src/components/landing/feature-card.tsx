"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/infra/utils";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  index
}: FeatureCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group flex flex-col items-center text-center md:items-start md:text-left p-6 md:p-8 rounded-2xl bg-white/50 hover:bg-white border border-transparent hover:border-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/5"
    >
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-black/5 text-black group-hover:bg-black group-hover:text-white transition-colors duration-300">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="mb-3 text-lg font-serif font-medium text-black group-hover:translate-x-1 transition-transform duration-300">
        {title}
      </h3>
      <p className="text-base text-black/60 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
