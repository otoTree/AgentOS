"use client";

import { cn } from "@/lib/infra/utils";
import { motion } from "framer-motion";

export function LandingHeader() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-6 z-50 w-full flex justify-center px-4"
    >
        <div className="flex items-center gap-6 rounded-full border border-white/20 bg-white/70 backdrop-blur-xl shadow-sm px-6 py-3">
          <span className="font-serif font-semibold text-black tracking-tight">AgentOS</span>
          <div className="h-4 w-px bg-black/5"></div>
          <nav className="flex items-center gap-4 text-sm font-medium text-black/60">
             <span className="hover:text-black transition-colors cursor-pointer">v1.0</span>
          </nav>
        </div>
    </motion.header>
  );
}
