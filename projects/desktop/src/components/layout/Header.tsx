import React from 'react';
import { 
  FolderPlus, Bell, Search
} from 'lucide-react';
import { useUIStore } from '../../mainview/store/useUIStore';

export function Header() {
  const { activeTab } = useUIStore();
  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-white/80 backdrop-blur titlebar z-10">
        <div className="flex items-center gap-3 no-drag">
            
            {/* Chat Title */}
            {activeTab === 'chat' && (
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-black">Chat</span>
                    <span className="text-black/20">|</span>
                    <div className="flex items-center gap-1.5 text-xs text-black/50 bg-black/5 px-2 py-0.5 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span>GPT-4o</span>
                    </div>
                </div>
            )}

            {/* Workspace Title */}
            {activeTab === 'workspace' && (
                 <h2 className="font-semibold text-black">Workspace</h2>
            )}

            {/* Other Titles */}
            {['skills', 'tasks', 'settings'].includes(activeTab) && (
                 <h2 className="font-semibold text-black capitalize">{activeTab}</h2>
            )}

        </div>
        <div className="flex items-center gap-2 no-drag">
            {/* Workspace Actions */}
            {activeTab === 'workspace' && (
                <button className="bg-black text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-black/90 transition-colors flex items-center gap-2 shadow-sm border border-transparent">
                    <FolderPlus size={14} /> Add Folder
                </button>
            )}

            {/* Default Actions */}
            {activeTab !== 'workspace' && (
                <div className="flex items-center gap-2">
                    <button className="w-7 h-7 rounded-md hover:bg-black/5 flex items-center justify-center text-black/60 transition-colors"><Bell size={16} /></button>
                    <button className="w-7 h-7 rounded-md hover:bg-black/5 flex items-center justify-center text-black/60 transition-colors"><Search size={16} /></button>
                </div>
            )}
        </div>
    </header>
  );
}
