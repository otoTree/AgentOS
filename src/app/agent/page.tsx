'use client';

import { createConversation } from "./actions";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Loader2, ArrowUp, Sparkles } from "lucide-react";
import { useChatStore } from "./store/useChatStore";
import { WindowManager } from "./[id]/window-manager";
import { motion } from "framer-motion";
import { cn } from "@/lib/infra/utils";
import { Button } from "@/components/ui/button";

export default function AgentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { reset: resetStore, windows, updateWindowMode, closeWindow, openWindow } = useChatStore();

  const SUGGESTED_PROMPTS = [
      "Write a Python crawler script",
      "Explain the principles of quantum computing",
      "Help me debug this code",
      "Create a marketing plan for a coffee shop",
      "Analyze current market trends"
  ];

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
  };

  const handleCreate = async () => {
    if (!input.trim() || isCreating) return;
    setIsCreating(true);
    try {
        // Reset store before navigating
        resetStore();
        
        // Create conversation with a title derived from the input
        const title = input.trim().length > 50 ? input.trim().substring(0, 50) + "..." : input.trim();
        const c = await createConversation(title);
        
        // Store initial message for the chat page to pick up and send
        sessionStorage.setItem('agent_initial_message', input.trim());

        router.push(`/agent/${c.id}`);
    } catch (e) {
        console.error(e);
        setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleCreate();
      }
  }

  return (
    <div className="h-full min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] text-foreground relative overflow-hidden">
      {/* Background decoration - subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FAFAFA] to-[#F5F5F5] pointer-events-none" />
      
      <WindowManager 
        windows={windows}
        onUpdateMode={updateWindowMode}
        onClose={closeWindow}
        onOpenWindow={openWindow}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl px-6 space-y-12 z-10"
      >
        <div className="text-center space-y-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-white shadow-sm border border-black/[0.04]"
            >
                <Sparkles className="w-5 h-5 text-black/40" />
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-black/90">
                AgentOS
            </h2>
            <p className="text-lg md:text-xl text-black/50 font-light max-w-lg mx-auto leading-relaxed">
                Your intelligent operating system interface.
                <br />
                Ready to assist with your next breakthrough.
            </p>
        </div>
        
        <div className="relative space-y-8">
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-black/[0.02] to-black/[0.02] rounded-2xl blur-xl transform group-hover:scale-[1.01] transition-transform duration-500" />
                <div className="relative bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-black/[0.08]">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="How can I help you today?"
                        className="w-full bg-transparent px-6 py-5 text-lg placeholder:text-black/30 text-black/80 outline-none resize-none overflow-y-auto min-h-[80px]"
                        style={{ maxHeight: '200px' }}
                        rows={1}
                        disabled={isCreating}
                        autoFocus
                    />
                    <div className="flex justify-between items-center px-4 pb-4">
                        <div className="text-xs text-black/30 font-medium px-2">
                            {input.length > 0 && `${input.length} chars`}
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={!input.trim() || isCreating}
                            size="icon"
                            className={cn(
                                "rounded-xl w-10 h-10 transition-all duration-300",
                                input.trim() ? "bg-black text-white hover:bg-black/90" : "bg-black/5 text-black/20 hover:bg-black/10"
                            )}
                        >
                            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            <motion.div 
                className="flex flex-wrap gap-3 justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 1 }}
            >
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        onClick={() => setInput(prompt)}
                        className="text-sm px-4 py-2 bg-white border border-black/[0.06] hover:border-black/20 hover:bg-black/[0.02] text-black/60 hover:text-black/90 rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                        {prompt}
                    </motion.button>
                ))}
            </motion.div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-6 text-xs text-black/20 font-medium tracking-widest uppercase">
        Designed for Clarity
      </div>
    </div>
  );
}
