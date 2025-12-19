import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ToolCallCard } from '../tool-call-card';
import { cn } from "@/lib/infra/utils";

interface MessageListProps {
  messages: any[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto pt-24 pb-4 px-4 scrollbar-thin scrollbar-thumb-black/5 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto space-y-8">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="h-16 w-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
                    <span className="font-serif font-bold text-2xl text-black/40">A</span>
                </div>
                <h2 className="text-2xl font-serif font-medium text-black">How can I help you today?</h2>
                <p className="text-sm text-black/40 max-w-md">
                    I can help you analyze data, write code, browse the web, and manage your files.
                </p>
            </div>
        )}
        
        {(() => {
            // Pre-process messages to group tool interactions
            const renderedItems: JSX.Element[] = [];
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                let handled = false;

                try {
                    if (msg.role === 'assistant' || msg.role === 'system') {
                        const parsed = JSON.parse(msg.content);
                        
                        if (parsed.type === 'tool_call') {
                            handled = true;
                            const toolName = parsed.tool;
                            const toolArgs = parsed.args;
                            let result = null;

                            // Look ahead for result
                            if (i + 1 < messages.length) {
                                const nextMsg = messages[i + 1];
                                try {
                                    const nextParsed = JSON.parse(nextMsg.content);
                                    if (nextParsed.type === 'tool_result' && nextParsed.tool === toolName) {
                                        result = nextParsed.output;
                                        i++; // Skip next message
                                    }
                                } catch (e) { /* ignore */ }
                            }

                            renderedItems.push(
                                <div key={msg.id} className="pl-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <ToolCallCard
                                        toolName={toolName}
                                        args={toolArgs}
                                        result={result}
                                        status={result ? 'success' : 'calling'}
                                    />
                                </div>
                            );
                        } else if (parsed.type === 'tool_plan') {
                            handled = true;
                            renderedItems.push(
                                <div key={msg.id} className="flex justify-start pl-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="max-w-[80%] rounded-2xl p-5 bg-white border border-black/5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                                            <span className="text-xs font-medium uppercase tracking-widest text-black/40">Thinking</span>
                                        </div>
                                        <div className="prose prose-sm prose-neutral max-w-none break-words text-black/80 font-light leading-relaxed">
                                            <ReactMarkdown>{parsed.thought || ''}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (parsed.type === 'tool_result') {
                            handled = true;
                            // Orphan result handler
                            renderedItems.push(
                                <div key={msg.id} className="flex justify-start w-full my-2 pl-12">
                                    <div className="max-w-[90%] w-full rounded-xl p-4 bg-red-50 border border-red-100">
                                        <div className="text-xs text-red-600 font-medium mb-1 uppercase tracking-wide">Orphan Tool Result ({parsed.tool})</div>
                                        <div className="bg-white/50 p-2 rounded font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto border border-red-100 text-red-800">
                                            {parsed.output}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    }
                } catch (e) {
                    // Not JSON, continue to normal rendering
                }

                if (!handled) {
                    const isUser = msg.role === 'user';
                    renderedItems.push(
                        <div 
                            key={msg.id} 
                            className={cn(
                                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
                                isUser ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn("flex gap-4 max-w-[85%]", isUser ? "flex-row-reverse" : "flex-row")}>
                                {/* Avatar */}
                                <div className={cn(
                                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                                    isUser ? "bg-black text-white" : "bg-white border border-black/5 text-black font-serif"
                                )}>
                                    {isUser ? "U" : "A"}
                                </div>

                                {/* Message Bubble */}
                                <div className={cn(
                                    "rounded-2xl px-6 py-4 shadow-sm",
                                    isUser 
                                        ? "bg-black text-white rounded-tr-sm" 
                                        : "bg-white border border-black/5 text-black rounded-tl-sm"
                                )}>
                                    <div className={cn(
                                        "prose prose-sm max-w-none break-words leading-relaxed",
                                        isUser ? "prose-invert" : "prose-neutral"
                                    )}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                    
                                    {/* Timestamp or Status (Optional) */}
                                    {/* <div className={cn("text-[10px] mt-2 opacity-40", isUser ? "text-white" : "text-black")}>
                                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div> */}
                                </div>
                            </div>
                        </div>
                    );
                }
            }
            return renderedItems;
        })()}
        <div ref={messagesEndRef} />
        </div>
    </div>
  );
}
