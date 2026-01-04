import React, { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Input } from '@agentos/web/components/ui/input';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { HistoryList } from '@/components/chat/HistoryList';
import { ContextPanel, Skill } from '@/components/chat/ContextPanel';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchMessages = async (id: string) => {
    setLoading(true);
    try {
        const res = await fetch(`/api/chat/sessions/${id}/messages`);
        if (res.ok) {
            const data = await res.json();
            // Convert DB messages to UI messages
            const uiMessages: Message[] = data.map((m: { role: 'user' | 'assistant'; content: string; createdAt: string }) => ({
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt).getTime()
            }));
            setMessages(uiMessages);
        }
    } catch (error) {
        console.error('Failed to load messages', error);
    } finally {
        setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setSessionId(undefined);
    // Keep active skills? Or clear? 
    // Usually user might want to keep context.
  };

  const handleSelectSession = (id: string) => {
      if (id === sessionId) return;
      setSessionId(id);
      fetchMessages(id);
  };

  const handleAddSkill = (skill: Skill) => {
    if (!activeSkills.find(s => s.id === skill.id)) {
      setActiveSkills([...activeSkills, skill]);
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setActiveSkills(activeSkills.filter(s => s.id !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Pass active skills to the API context if backend supports it
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            message: userMessage.content,
            sessionId,
            context: {
                skills: activeSkills.map(s => s.id)
            }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Update session ID if it was a new chat
      if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      // You might want to show an error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout mainClassName="overflow-hidden p-0">
      <div className="flex h-full w-full bg-background">
        {/* Left: History */}
        <HistoryList 
            currentSessionId={sessionId}
            onNewChat={handleNewChat} 
            onSelectSession={handleSelectSession}
        />

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col h-full min-w-0">
            <header className="px-6 py-4 border-b flex-shrink-0">
            <h1 className="text-xl font-semibold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Powered by SuperAgent</p>
            </header>

            <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 px-2 max-w-3xl mx-auto">
                {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[40vh] text-center text-muted-foreground">
                    <p className="text-lg mb-2">👋 Welcome!</p>
                    <p>Start a conversation with your AI assistant.</p>
                </div>
                )}
                
                {messages.map((msg, idx) => (
                <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    >
                    <div className="prose prose-sm dark:prose-invert break-words max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    </div>
                </div>
                ))}
                {loading && (
                <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                    </div>
                </div>
                )}
                <div ref={scrollRef} />
            </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background flex-shrink-0">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        disabled={loading}
                        className="flex-1"
                        />
                        <Button type="submit" disabled={loading || !input.trim()}>
                        <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>

        {/* Right: Context */}
        <ContextPanel 
            activeSkills={activeSkills}
            onAddSkill={handleAddSkill}
            onRemoveSkill={handleRemoveSkill}
        />
      </div>
    </AdminLayout>
  );
}
