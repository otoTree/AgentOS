'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createConversation, deleteConversation } from "./actions";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Folder, Mail, Globe, AppWindow, User, Table } from "lucide-react";
import { useChatStore } from "./store/useChatStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "./components/user-profile-dialog";

interface Conversation {
    id: string;
    title: string;
}

interface SidebarProps {
    initialConversations: Conversation[];
    user?: any;
}

export default function Sidebar({ initialConversations, user }: SidebarProps) {
    const [conversations, setConversations] = useState(initialConversations);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const router = useRouter();
    const params = useParams();
    const currentId = params?.id as string;
    const { reset: resetStore, openWindow, activeBrowserSessionId, browserState } = useChatStore();

    const filtered = conversations.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            // Reset the store immediately to prepare for the new chat
            resetStore();
            const c = await createConversation();
            // Update local state immediately
            setConversations(prev => [c, ...prev]);
            router.push(`/agent/${c.id}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Delete this conversation?")) {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentId === id) {
                router.push('/agent');
            }
            router.refresh();
        }
    };

    return (
        <div className="relative h-full flex-shrink-0">
            <aside 
                className={`${
                    isCollapsed ? 'w-0 border-none' : 'w-64 border-r'
                } bg-muted/10 flex flex-col h-full transition-all duration-300 overflow-hidden`}
            >
                {/* Logo Section */}
                <div className="p-4 border-b flex flex-col gap-1 min-w-[16rem]">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                            A
                        </div>
                        Agent OS
                    </div>
                    <p className="text-xs text-muted-foreground">Your AI Workspace</p>
                </div>

                <div className="p-4 border-b space-y-3 min-w-[16rem]">
                    <button 
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : <><Plus className="w-4 h-4" /> New Chat</>}
                    </button>
                    
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 min-w-[16rem]">
                    {filtered.map((c) => (
                        <div key={c.id} className="group relative">
                            <Link
                                href={`/agent/${c.id}`}
                                className={`block px-3 py-2 rounded-md text-sm truncate transition-colors pr-8 ${
                                    currentId === c.id
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                                }`}
                            >
                                {c.title}
                            </Link>
                            <button
                                onClick={(e) => handleDelete(e, c.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                title="Delete"
                                >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    {filtered.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">
                            {searchQuery ? 'No matching chats' : 'No conversations yet'}
                        </div>
                    )}
                </div>

                {/* Footer Tools */}
                <div className="p-2 border-t flex justify-around min-w-[16rem]">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWindow('file-browser')}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <Folder className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Files</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWindow('email')}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <Mail className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Email</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWindow('browser', { sessionId: activeBrowserSessionId, state: browserState })}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Browser</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWindow('konva-table', {
                                        initialData: {
                                            columns: [
                                                { id: 'id', title: 'ID', width: 50, type: 'text' },
                                                { id: 'name', title: 'Name', width: 150, type: 'text' },
                                                { id: 'status', title: 'Status', width: 100, type: 'select' },
                                                { id: 'date', title: 'Date', width: 120, type: 'date' }
                                            ],
                                            rows: [
                                                { id: '1', name: 'Task 1', status: 'Active', date: '2024-03-20' },
                                                { id: '2', name: 'Task 2', status: 'Pending', date: '2024-03-21' },
                                            ]
                                        }
                                    })}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <Table className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Table</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWindow('workbench')}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <AppWindow className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Workbench</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* User Profile */}
                <div className="p-2 border-t min-w-[16rem]">
                    <button 
                        onClick={() => setIsProfileOpen(true)}
                        className="flex items-center gap-3 w-full hover:bg-muted p-2 rounded-md transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border flex items-center justify-center shrink-0">
                            {user?.image ? (
                                <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">@{user?.username || 'user'}</p>
                        </div>
                    </button>
                </div>
            </aside>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-6 h-12 bg-background border shadow-sm rounded-full cursor-pointer hover:bg-accent text-muted-foreground"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <UserProfileDialog 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                user={user}
                onUserUpdated={() => router.refresh()}
            />
        </div>
    );
}