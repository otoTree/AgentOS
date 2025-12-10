import { useRef, useEffect, useState } from 'react';
import { CommandMenu, getFilteredCommands, Command } from '../command-menu';

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

  return (
    <div className="p-4 bg-background">
        <div className="max-w-2xl  mx-auto space-y-4">
            {/* Suggested Prompts */}
            {showEmptyState && (
               <div className="flex flex-wrap gap-2 justify-center pb-2">
                   {SUGGESTED_PROMPTS.map((prompt, i) => (
                       <button
                           key={i}
                           type="button"
                           onClick={() => setInput(prompt)}
                           className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors border"
                       >
                           {prompt}
                       </button>
                   ))}
               </div>
            )}

            <form onSubmit={(e) => onSendMessage(e)} className="flex gap-2 w-full items-end">
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="p-3 text-muted-foreground hover:text-foreground bg-muted/50 rounded-2xl transition-colors disabled:opacity-50"
                title="Upload file"
            >
                {isUploading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                )}
            </button>

            <div className="flex-1 relative">
                <CommandMenu 
                    isVisible={showCommandMenu}
                    filter={input}
                    selectedIndex={commandMenuIndex}
                    onSelect={handleCommandSelect}
                />
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setInput(newValue);
                        if (newValue.startsWith('/')) {
                            setShowCommandMenu(true);
                            setCommandMenuIndex(0);
                        } else {
                            setShowCommandMenu(false);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (showCommandMenu) {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const count = getFilteredCommands(input).length;
                                if (count > 0) setCommandMenuIndex(prev => (prev + 1) % count);
                                return;
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                const count = getFilteredCommands(input).length;
                                if (count > 0) setCommandMenuIndex(prev => (prev - 1 + count) % count);
                                return;
                            } else if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                const cmds = getFilteredCommands(input);
                                if (cmds[commandMenuIndex]) {
                                    handleCommandSelect(cmds[commandMenuIndex]);
                                }
                                return;
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowCommandMenu(false);
                                return;
                            }
                        }

                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSendMessage();
                        }
                    }}
                    placeholder={enabledTools.length > 0 
                        ? `Type a message or /open... I can use ${enabledTools.map(t => t.name).join(', ')}.`
                        : "Type a message or /open... I'm ready to help."}
                    className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none min-h-[48px] max-h-[120px] resize-none overflow-y-auto"
                    disabled={isLoading}
                    rows={1}
                />
            </div>
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed h-[48px]"
            >
                Send
            </button>
            </form>
        </div>
    </div>
  );
}
