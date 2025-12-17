'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createConversation, deleteConversation } from "./actions";
import { Plus, Trash2, ChevronLeft, ChevronRight, User, Settings, LogOut, MessageSquare, Folder, Mail, Globe, AppWindow, Table, Database, Workflow } from "lucide-react";
import { useChatStore } from "./store/useChatStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "./components/user-profile-dialog";
import { cn } from "@/lib/infra/utils";
import { Button } from "@/components/ui/button";

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
    const [isCreating, setIsCreating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const router = useRouter();
    const params = useParams();
    const currentId = params?.id as string;
    const { reset: resetStore, openWindow, activeBrowserSessionId, browserState } = useChatStore();

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            resetStore();
            //const c = await createConversation();
            //setConversations(prev => [c, ...prev]);
            router.push(`/agent`);
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
        <div className={cn("relative h-full flex-shrink-0 z-20 transition-all duration-500 ease-in-out", isCollapsed ? "w-0" : "w-[280px]")}>
            <aside 
                className={cn(
                    "flex flex-col h-full bg-[#FAFAFA] border-r border-black/5 overflow-hidden",
                    isCollapsed && "hidden"
                )}
            >
                {/* Header */}
                <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-serif font-bold text-lg">
                            A
                        </div>
                        <div className="flex flex-col">
                            <span className="font-serif font-semibold text-black tracking-tight leading-none">AgentOS</span>
                            <span className="text-[10px] uppercase tracking-widest text-black/40 mt-1">Workspace</span>
                        </div>
                    </div>

                    <Button 
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="w-full justify-start gap-3 h-11 bg-white border border-black/5 text-black hover:bg-black/5 shadow-sm hover:shadow-md transition-all rounded-xl"
                        variant="ghost"
                    >
                        <Plus className="w-4 h-4 text-black/60" />
                        <span className="font-medium">New Chat</span>
                    </Button>
                </div>

                {/* Navigation List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin scrollbar-thumb-black/5 scrollbar-track-transparent">
                    <div className="px-2 py-1.5 text-xs font-medium text-black/30 uppercase tracking-widest">
                        History
                    </div>
                    {conversations.map(c => (
                        <Link
                            key={c.id}
                            href={`/agent/${c.id}`}
                            className={cn(
                                "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                                currentId === c.id 
                                    ? "bg-white text-black shadow-sm border border-black/5" 
                                    : "text-black/60 hover:text-black hover:bg-black/5"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className={cn("w-4 h-4 flex-shrink-0", currentId === c.id ? "text-black" : "text-black/30")} />
                                <span className="truncate">{c.title || "Untitled Conversation"}</span>
                            </div>
                            
                            <button
                                onClick={(e) => handleDelete(e, c.id)}
                                className={cn(
                                    "opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all",
                                    currentId === c.id && "opacity-100"
                                )}
                            >
                                <Trash2 className="w-3.5 h-3.5 text-black/40 hover:text-red-500" />
                            </button>
                        </Link>
                    ))}
                </div>

                {/* Footer Tools */}
                <div className="px-4 py-3 border-t border-black/5 bg-white/50 backdrop-blur-sm">
                    <div className="grid grid-cols-4 gap-1 p-2 bg-white rounded-xl border border-black/5 shadow-sm">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('file-browser')} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Folder className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Files</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('email')} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Mail className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Email</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('browser', { sessionId: activeBrowserSessionId, state: browserState })} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Globe className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Browser</TooltipContent>
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
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Table className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Table</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('smart-query')} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Database className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Query</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('workbench')} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <AppWindow className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Workbench</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => openWindow('sop-agent')} 
                                        className="p-2 flex justify-center items-center text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                                    >
                                        <Workflow className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">SOP Agent</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-black/5 bg-white/50 backdrop-blur-sm">
                    <button 
                        onClick={() => setIsProfileOpen(true)}
                        className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-black/5 transition-colors group"
                    >
                        <div className="h-9 w-9 rounded-full bg-black/5 flex items-center justify-center text-black/60 group-hover:bg-black group-hover:text-white transition-colors">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-sm font-medium text-black truncate w-full text-left">{user?.name || 'User'}</span>
                            <span className="text-xs text-black/40 truncate w-full text-left">{user?.email}</span>
                        </div>
                        <Settings className="w-4 h-4 text-black/20 ml-auto group-hover:text-black/60" />
                    </button>
                </div>
            </aside>

            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "absolute -right-4 top-8 z-50 h-8 w-8 rounded-full border border-black/5 bg-white shadow-lg flex items-center justify-center text-black/40 hover:text-black hover:scale-110 transition-all duration-300",
                    isCollapsed && "left-4 top-4"
                )}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <UserProfileDialog 
                open={isProfileOpen} 
                onOpenChange={setIsProfileOpen}
                user={user}
            />
        </div>
    );
}
