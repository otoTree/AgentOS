"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <div className="relative flex flex-col items-center justify-center z-10 py-24 md:py-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 text-center max-w-4xl px-6"
        >
            <div className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-black/60 border border-black/5 bg-white/50 backdrop-blur-sm">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              The Intelligent Operating System
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-light tracking-tight text-black leading-[1.1]">
              Agent
              <span className="italic font-serif text-black/80 ml-4">Operating System</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-black/60 max-w-2xl text-center leading-relaxed font-light">
                The ultimate infrastructure for autonomous agents. <br className="hidden md:block"/>
                File systems, workspaces, and execution in harmony.
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-4"
            >
                 <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-black text-white text-sm font-medium transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-black/5"
                >
                    Get Started
                 </Link>
                 <Link
                    href="https://github.com"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-black/10 bg-white/50 backdrop-blur-sm text-black text-sm font-medium transition-all hover:bg-white hover:border-black/20"
                >
                    Documentation
                 </Link>
            </motion.div>
        </motion.div>
      </div>
  );
}
