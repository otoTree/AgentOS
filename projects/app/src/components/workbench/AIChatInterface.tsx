import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@agentos/web/components/ui/button';
import { Textarea } from '@agentos/web/components/ui/textarea';
import { Loader2, Wand2, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { toast } from '@agentos/web/components/ui/sonner';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type ChatSession = {
  id: string;
  name: string;
  messages: ChatMessage[];
  updatedAt: number;
}

type AIChatInterfaceProps = {
  skillId: string;
  models: { id: string }[];
  onCodeUpdate: (filename: string, code: string) => void;
  selectedFile?: string;
}

export function AIChatInterface({ skillId, models, onCodeUpdate }: AIChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const initializedSkillId = useRef<string | null>(null);

  // Initialize default session
  useEffect(() => {
    if (initializedSkillId.current === skillId) return;
    initializedSkillId.current = skillId;

    // Try to load from local storage or create new
    const saved = localStorage.getItem(`skill_chat_${skillId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
            if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
        } catch (e) {
            console.error("Failed to parse chat history", e);
            createSession();
        }
    } else {
        createSession();
    }
  }, [skillId]);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem(`skill_chat_${skillId}`, JSON.stringify(sessions));
    }
  }, [sessions, skillId]);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [sessions, currentSessionId]);

  const createSession = () => {
    const newSession: ChatSession = {
        id: crypto.randomUUID(),
        name: `Chat ${sessions.length + 1}`,
        messages: [],
        updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
        setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
    if (newSessions.length === 0) {
        // If no sessions left, wait for state update then create one? 
        // Or just let user create manually. Let's force one.
        setTimeout(() => createSession(), 0);
    }
  };
  
  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);
  
  const updateCurrentSessionMessages = (updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
              return { ...s, messages: updater(s.messages), updatedAt: Date.now() };
          }
          return s;
      }));
  };

  const handleAIChat = async () => {
    if (!chatInput.trim() || !models.length || !currentSessionId) return;
    
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: 'Thinking...', 
        timestamp: Date.now() 
    };
    
    updateCurrentSessionMessages(prev => [...prev, userMsg, assistantMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`/api/workbench/skills/${skillId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instruction: userMsg.content,
          modelId: models[0].id
        })
      });
      
      if (!res.ok) throw new Error('AI request failed');
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      let currentContent = '';
      
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        
        for (const part of parts) {
            if (part.startsWith('data: ')) {
                const data = JSON.parse(part.slice(6));
                
                if (data.type === 'step') {
                    const step = data.step;
                    if (step.type === 'tool_call') {
                        if (step.content) {
                           currentContent += `> 💭 ${step.content}\n`;
                        }
                        const args = JSON.stringify(step.toolArgs || {});
                        currentContent += `\n> 🛠️ Executing: ${step.toolName} with args: ${args}\n`;
                    } else if (step.type === 'tool_result') {
                        // Optional: Show output?
                        // currentContent += `> ✅ Result: ${JSON.stringify(step.toolOutput).slice(0, 100)}...\n`;
                        currentContent += `> ✅ Tool Finished\n`;
                    } else if (step.type === 'thought') {
                         if (step.content) {
                            currentContent += `> 💭 ${step.content}\n`;
                         }
                    } else if (step.type === 'error') {
                        currentContent += `\n> ❌ Error: ${step.content}\n`;
                    }
                    
                    // Update UI
                    updateCurrentSessionMessages(prev => {
                        const newHistory = [...prev];
                        if (newHistory.length === 0) return prev; // Safety check
                        
                        const lastMsg = newHistory[newHistory.length - 1];
                        if (lastMsg.role === 'assistant') {
                             newHistory[newHistory.length - 1] = {
                                ...lastMsg,
                                content: currentContent || 'Processing...'
                            };
                        }
                        return newHistory;
                    });
                } else if (data.type === 'result') {
                    const result = data.result;
                    currentContent += `\nDone! Updated ${result.filename}.`;
                    
                    updateCurrentSessionMessages(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1] = {
                            ...newHistory[newHistory.length - 1],
                            content: currentContent
                        };
                        return newHistory;
                    });
                    
                    onCodeUpdate(result.filename, result.code);
                    toast.success('Skill code updated by AI');
                } else if (data.type === 'error') {
                    throw new Error(data.error);
                }
            }
        }
      }

    } catch (err: unknown) {
        const errorMsg: ChatMessage = {
            role: 'system',
            content: `Error: ${(err as Error).message || 'AI generation failed'}`,
            timestamp: Date.now()
        };
        updateCurrentSessionMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const currentSession = getCurrentSession();

  return (
    <div className="flex h-full gap-4">
        {/* Session List Sidebar */}
        <div className="w-48 flex flex-col border-r pr-2 gap-2">
             <Button variant="outline" className="w-full justify-start gap-2" onClick={createSession}>
                <Plus className="w-4 h-4" /> New Chat
             </Button>
             <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1">
                    {sessions.map(session => (
                        <div 
                            key={session.id}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm hover:bg-accent group ${currentSessionId === session.id ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
                            onClick={() => setCurrentSessionId(session.id)}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{session.name}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => deleteSession(session.id, e)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
             </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
             <div ref={chatScrollRef} className="flex-1 border rounded-md p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4 min-h-0">
                {!currentSession || currentSession.messages.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-20">
                        <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Ask the AI to generate or refine your skill code.</p>
                        <p className="text-xs mt-2">Example: "Add a function to fetch data from an API"</p>
                    </div>
                ) : (
                    currentSession.messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : msg.role === 'system'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-white dark:bg-slate-800 border shadow-sm'
                            }`}>
                                <pre className="whitespace-pre-wrap font-sans text-sm break-words">{msg.content}</pre>
                            </div>
                        </div>
                    ))
                )}
                {aiLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    </div>
                )}
             </div>
             
             <div className="flex gap-2">
                <Textarea 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Describe what you want to change..."
                    className="min-h-[60px] max-h-[150px]"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAIChat();
                        }
                    }}
                />
                <Button size="icon" className="h-[60px] w-[60px]" onClick={handleAIChat} disabled={aiLoading || !chatInput.trim()}>
                    {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                </Button>
             </div>
        </div>
    </div>
  );
}
