import { useRef, useEffect, useState } from 'react';
import { CommandMenu, getFilteredCommands, Command } from '../command-menu';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, SendHorizontal, Sparkles } from 'lucide-react';
import { cn } from "@/lib/infra/utils";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isUploading: boolean;
  onSendMessage: (e?: React.FormEvent, overrideContent?: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  enabledTools: { name: string }[];
  showEmptyState: boolean;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  isUploading,
  onSendMessage,
  onFileUpload,
  enabledTools,
  showEmptyState
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuIndex, setCommandMenuIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const SUGGESTED_PROMPTS = [
      "Write a Python crawler script",
      "Explain the principles of quantum computing",
      "Help me debug this code",
      "Create a marketing plan for a coffee shop",
      "Analyze current market trends"
  ];

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleCommandSelect = (cmd: Command) => {
      setInput(cmd.value + ' ');
      setShowCommandMenu(false);
      textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
    }
  };

  return (
    <div className="p-6 bg-transparent w-full">
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Suggested Prompts */}
            {showEmptyState && (
               <div className="flex flex-wrap gap-3 justify-center pb-4 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-forwards">
                   {SUGGESTED_PROMPTS.map((prompt, i) => (
                       <button
                           key={i}
                           type="button"
                           onClick={() => setInput(prompt)}
                           className="text-xs px-4 py-2 bg-white border border-black/5 text-black/60 hover:text-black hover:border-black/20 hover:shadow-sm rounded-full transition-all duration-300"
                       >
                           {prompt}
                       </button>
                   ))}
               </div>
            )}

            <form 
                onSubmit={(e) => onSendMessage(e)} 
                className={cn(
                    "relative flex items-end gap-2 bg-white rounded-[2rem] p-2 shadow-2xl shadow-black/5 border transition-all duration-300",
                    isFocused ? "border-black/10 ring-1 ring-black/5" : "border-black/5"
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    className="hidden"
                />
                
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="h-10 w-10 rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors mb-0.5"
                    title="Upload file"
                >
                    {isUploading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Paperclip className="w-5 h-5" />
                    )}
                </Button>

                <div className="flex-1 relative mb-2">
                    <CommandMenu 
                        isVisible={showCommandMenu}
                        filter={input}
                        selectedIndex={commandMenuIndex}
                        onSelect={handleCommandSelect}
                    />
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            setInput(e.target.value);
                            setShowCommandMenu(e.target.value.endsWith('/'));
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Type a message or type '/' for commands..."
                        className="min-h-[24px] max-h-[120px] w-full resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground leading-relaxed"
                        rows={1}
                    />
                </div>

                <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className={cn(
                        "h-10 w-10 rounded-full transition-all duration-300 mb-0.5",
                        input.trim() 
                            ? "bg-black text-white hover:bg-black/90 shadow-md" 
                            : "bg-black/5 text-black/20 hover:bg-black/10"
                    )}
                >
                    <SendHorizontal className="w-5 h-5 ml-0.5" />
                </Button>
            </form>
            
            <div className="text-center">
                <p className="text-[10px] text-black/20 font-medium tracking-widest uppercase">
                    AI Agent can make mistakes. Verify important info.
                </p>
            </div>
        </div>
    </div>
  );
}
