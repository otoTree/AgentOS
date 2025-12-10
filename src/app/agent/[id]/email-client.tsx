'use client';

import { useState, useEffect } from 'react';
import { getEmails, getEmail } from '@/app/actions';
import { RefreshCw, ArrowLeft, Mail } from 'lucide-react';

interface Email {
    id: string;
    subject: string | null;
    from: string;
    to: string;
    receivedAt: Date;
    isRead: boolean;
    body: string | null;
    html: string | null;
}

export function EmailClient() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadEmails = async () => {
        setLoading(true);
        try {
            const data = await getEmails();
            setEmails(data);
            setError(null);
        } catch (err) {
            console.error("Failed to load emails", err);
            setError("Failed to load emails");
        } finally {
            setLoading(false);
        }
    };

    const loadEmailDetails = async (id: string) => {
        setLoading(true);
        try {
            const email = await getEmail(id);
            if (email) {
                setSelectedEmail(email);
                // Update read status in list
                setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
            }
        } catch (err) {
            console.error("Failed to load email details", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmails();
    }, []);

    if (selectedEmail) {
        return (
            <div className="flex flex-col h-full bg-background">
                <div className="flex items-center gap-2 p-2 border-b">
                    <button 
                        onClick={() => setSelectedEmail(null)}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-sm truncate">{selectedEmail.subject || '(No Subject)'}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-6 border-b pb-4">
                        <h1 className="text-xl font-bold mb-2">{selectedEmail.subject || "(No Subject)"}</h1>
                        <div className="flex justify-between items-start text-sm">
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="text-muted-foreground w-10">From:</span>
                                    <span className="font-medium">{selectedEmail.from}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-muted-foreground w-10">To:</span>
                                    <span>{selectedEmail.to}</span>
                                </div>
                            </div>
                            <div className="text-muted-foreground">
                                {new Date(selectedEmail.receivedAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                        {selectedEmail.html ? (
                            <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                        ) : (
                            <pre className="whitespace-pre-wrap font-sans">{selectedEmail.body}</pre>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <h3 className="font-medium text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Inbox
                </h3>
                <button 
                    onClick={loadEmails} 
                    disabled={loading}
                    className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {error ? (
                    <div className="p-4 text-center text-destructive text-sm">{error}</div>
                ) : emails.length === 0 && !loading ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No emails found.
                    </div>
                ) : (
                    <div className="divide-y">
                        {emails.map(email => (
                            <div 
                                key={email.id}
                                onClick={() => loadEmailDetails(email.id)}
                                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!email.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm truncate max-w-[200px] ${!email.isRead ? 'font-semibold' : 'text-foreground'}`}>
                                        {email.from}
                                    </span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {new Date(email.receivedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={`text-sm truncate ${!email.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                    {email.subject || '(No Subject)'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
