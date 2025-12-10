import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ToolCallCard } from '../tool-call-card';

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
    <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
                <p>Start chatting with the agent.</p>
                <p className="text-sm mt-2">Enable tools to give it capabilities.</p>
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
                            // Simple heuristic: next message is system tool_result with same tool name
                            if (i + 1 < messages.length) {
                                const nextMsg = messages[i + 1];
                                try {
                                    const nextParsed = JSON.parse(nextMsg.content);
                                    if (nextParsed.type === 'tool_result' && nextParsed.tool === toolName) {
                                        result = nextParsed.output;
                                        i++; // Skip next message
                                    }
                                } catch (e) {}
                            }

                            renderedItems.push(
                                <ToolCallCard
                                    key={msg.id}
                                    toolName={toolName}
                                    args={toolArgs}
                                    result={result}
                                    status={result ? 'success' : 'calling'}
                                />
                            );
                        } else if (parsed.type === 'tool_plan') {
                            handled = true;
                            renderedItems.push(
                                <div key={msg.id} className="flex justify-start">
                                    <div className="max-w-[80%] rounded-lg p-4 bg-muted/50 border">
                                        <div className="prose dark:prose-invert text-sm max-w-none break-words">
                                            <ReactMarkdown>{parsed.thought || ''}</ReactMarkdown>
                                        </div>
                                        <div className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{msg.role}</div>
                                    </div>
                                </div>
                            );
                        } else if (parsed.type === 'tool_result') {
                            // Orphan result? Should be handled by lookahead, but just in case
                            handled = true;
                            renderedItems.push(
                                <div key={msg.id} className="flex justify-start w-full my-2">
                                    <div className="max-w-[90%] w-full rounded-lg p-2 bg-red-500/10 border border-red-500/20">
                                        <div className="text-xs text-red-600 font-medium mb-1">Orphan Tool Result ({parsed.tool})</div>
                                        <div className="bg-muted p-2 rounded font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto border">
                                            {parsed.output}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    }
                } catch (e) {
                    // Not JSON
                }

                if (!handled) {
                    // Parse out file attachments from content
                    // Format: [File: name](url)
                    const fileRegex = /\[File:\s*(.*?)\]\((.*?)\)/g;
                    const attachments: { name: string, url: string }[] = [];
                    let cleanContent = msg.content;
                    
                    let match;
                    while ((match = fileRegex.exec(msg.content)) !== null) {
                        attachments.push({ name: match[1], url: match[2] });
                    }

                    // Remove the links from the display content
                    cleanContent = cleanContent.replace(fileRegex, '').trim();

                    renderedItems.push(
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-lg p-4 ${
                                    msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : msg.role === 'system'
                                    ? 'bg-muted text-xs font-mono whitespace-pre-wrap'
                                    : 'bg-muted/50 border'
                                }`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div className="prose dark:prose-invert text-sm max-w-none break-words">
                                        <ReactMarkdown>{cleanContent || ''}</ReactMarkdown>
                                    </div>
                                ) : (
                                     <div className="text-sm whitespace-pre-wrap break-words">{cleanContent}</div>
                                )}

                                {/* Attachments Display */}
                                {attachments.length > 0 && (
                                    <div className={`mt-3 flex flex-wrap gap-2 ${msg.role === 'user' ? '' : 'pt-2 border-t'}`}>
                                        {attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded border transition-colors ${
                                                    msg.role === 'user'
                                                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 border-white/20'
                                                    : 'bg-background hover:bg-muted'
                                                }`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                </svg>
                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                <div className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{msg.role}</div>
                            </div>
                        </div>
                    );
                }
            }
            
            return renderedItems;
        })()}
        {isLoading && (
             <div className="flex justify-start">
                <div className="bg-muted/50 border rounded-lg p-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
        </div>
    </div>
  );
}
