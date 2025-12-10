'use client';

import { createConversation } from "./actions";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import { useChatStore } from "./store/useChatStore";

export default function AgentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resetStore = useChatStore(state => state.reset);

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
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground">Welcome to AgentOS</h2>
            <p className="text-lg text-muted-foreground">Your intelligent operating system interface.</p>
        </div>
        
        <div className="relative space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                        key={i}
                        onClick={() => setInput(prompt)}
                        className="text-sm px-4 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors border"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    className="w-full bg-muted/50 border rounded-xl px-6 py-4 text-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none overflow-y-auto shadow-sm min-h-[80px]"
                    style={{ maxHeight: '200px' }}
                    rows={1}
                    disabled={isCreating}
                    autoFocus
                />
                <button 
                    onClick={handleCreate}
                    disabled={!input.trim() || isCreating}
                    className="absolute right-3 bottom-3 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-70">
             {/* Optional suggestions/tips could go here, keeping it clean for now */}
        </div>
      </div>
    </div>
  );
}
