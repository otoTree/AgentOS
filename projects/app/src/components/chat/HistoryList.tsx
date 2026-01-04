import React, { useEffect, useState } from 'react';
import { Button } from '@agentos/web/components/ui/button';
import { ScrollArea } from '@agentos/web/components/ui/scroll-area';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Session = {
  id: string;
  title: string;
  updatedAt: string;
}

type HistoryListProps = {
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}

export function HistoryList({ currentSessionId, onNewChat, onSelectSession }: HistoryListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]); // Refetch when session changes (e.g. title updated or new session created)

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/10 border-r w-64">
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            History
          </div>
          {loading && sessions.length === 0 ? (
             <div className="flex justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
             </div>
          ) : (
            <div className="space-y-1">
                {sessions.map((item) => (
                <Button
                    key={item.id}
                    variant={currentSessionId === item.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto py-3 px-3 font-normal"
                    onClick={() => onSelectSession(item.id)}
                >
                    <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                        {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </div>
                    </div>
                </Button>
                ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
