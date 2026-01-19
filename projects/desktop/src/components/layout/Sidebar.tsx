import React, { useEffect } from 'react';
import { 
  MessageSquare, FolderOpen, Sparkles, ListTodo, Settings, 
  Rocket, Leaf, User, ChevronRight, Plus, Trash2
} from 'lucide-react';
import { cn } from '../../mainview/utils/cn';
import { Tab } from '../../mainview/types';
import { useUIStore } from '../../mainview/store/useUIStore';
import { useChatStore } from '../../mainview/store/useChatStore';

export function Sidebar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession, deleteSession, loadSessions } = useChatStore();

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <aside className="w-[260px] flex flex-col bg-[#f2f2f2]/90 backdrop-blur-xl border-r border-black/5 transition-all duration-300 titlebar relative z-20 pt-10">
      
      {/* Section: Platform */}
      <div className="px-3 mb-2 mt-1 flex-1 overflow-y-auto no-drag">
          <div className="text-[10px] font-bold text-black/40 px-3 mb-2 uppercase tracking-widest">Platform</div>
          <nav className="space-y-1">
              <NavItem id="chat" label="Chat" icon={MessageSquare} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
              <NavItem id="workspace" label="Workspace" icon={FolderOpen} active={activeTab === 'workspace'} onClick={() => setActiveTab('workspace')} />
              <NavItem id="skills" label="Skill Studio" icon={Sparkles} active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} />
              <NavItem id="tasks" label="Task Manager" icon={ListTodo} active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
              <NavItem id="settings" label="Settings" icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>
          
          {activeTab === 'chat' && (
            <>
              <div className="flex items-center justify-between px-3 mb-2 mt-6 group">
                <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Sessions</div>
                <button 
                  onClick={() => createSession('New Chat')}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 text-black/40 hover:text-black transition-colors"
                >
                  <Plus size={10} />
                </button>
              </div>
              <nav className="space-y-1">
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-lg transition-all duration-200 group gap-3 text-[13px] font-medium leading-none h-9 cursor-pointer relative",
                      activeSessionId === session.id ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-black/60 hover:bg-black/5 hover:text-black'
                    )}
                    onClick={() => selectSession(session.id)}
                  >
                    <MessageSquare size={14} className={cn("flex-shrink-0", activeSessionId === session.id ? "text-black" : "text-black/40")} />
                    <span className="truncate flex-1">{session.title || 'New Chat'}</span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 absolute right-1.5",
                        activeSessionId === session.id ? "bg-gray-50" : ""
                      )}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </nav>
            </>
          )}

          {activeTab !== 'chat' && (
            <>
              {/* Section: Projects (Demo) */}
              <div className="text-[10px] font-bold text-black/40 px-3 mb-2 mt-6 uppercase tracking-widest">Projects</div>
              <nav className="space-y-1">
                  <a href="#" className="flex items-center px-3 py-1.5 rounded-lg text-black/60 hover:bg-black/5 hover:text-black transition-all duration-200 gap-3 text-[13px] font-medium leading-none h-9">
                      <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-[8px] text-white shadow-sm"><Rocket size={10} /></div>
                      <span>AgentOS Core</span>
                  </a>
                  <a href="#" className="flex items-center px-3 py-1.5 rounded-lg text-black/60 hover:bg-black/5 hover:text-black transition-all duration-200 gap-3 text-[13px] font-medium leading-none h-9">
                      <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-[8px] text-white shadow-sm"><Leaf size={10} /></div>
                      <span>Eco Scanner</span>
                  </a>
              </nav>
            </>
          )}
      </div>

      {/* Bottom User Area */}
      <div className="p-3 no-drag mt-auto">
          <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/60 transition-colors text-left group border border-transparent hover:border-black/5 hover:shadow-sm">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 border border-black/5 shadow-inner flex items-center justify-center text-black/50">
                   <User className="text-xs w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                  <div className="font-medium text-black text-[12px] group-hover:text-black">User Name</div>
                  <div className="text-[10px] text-black/40 group-hover:text-black/60">Pro Workspace</div>
              </div>
              <ChevronRight className="ml-auto w-3 h-3 text-black/20 group-hover:text-black/40" />
          </button>
      </div>
    </aside>
  );
}

function NavItem({ id, label, icon: Icon, active, onClick }: { id: Tab, label: string, icon: React.ElementType, active: boolean, onClick: () => void }) {
  return (
    <a href="#"
       onClick={(e) => { e.preventDefault(); onClick(); }}
       className={cn(
         "flex items-center px-3 py-1.5 rounded-lg transition-all duration-200 group gap-3 text-[13px] font-medium leading-none h-9",
         active ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-black/60 hover:bg-black/5 hover:text-black'
       )}>
        <Icon className={cn("text-sm w-5 text-center transition-opacity", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")} size={16} />
        <span>{label}</span>
    </a>
  );
}
