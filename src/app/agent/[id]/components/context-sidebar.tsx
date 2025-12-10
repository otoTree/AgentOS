import { FileManager, ToolManager } from '../context-manager';
import { Browser } from '../browser';

interface Tool {
    id: string;
    name: string;
    description: string | null;
    projectName?: string;
}

interface ContextSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  activeTab: 'enabled' | 'marketplace' | 'files' | 'browser';
  setActiveTab: (tab: 'enabled' | 'marketplace' | 'files' | 'browser') => void;
  enabledTools: Tool[];
  toggleTool: (toolId: string) => void;
  attachedFiles: any[];
  onAttachToggle: (fileId: string, attach: boolean) => Promise<void>;
  conversationId: string;
  availableTools: any[];
  setAvailableTools: (tools: any[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFiles: () => void;
  activeBrowserSessionId: string | null;
  setActiveBrowserSessionId: (id: string | null) => void;
  browserState: any;
}

export function ContextSidebar({
  isVisible,
  onClose,
  activeTab,
  setActiveTab,
  enabledTools,
  toggleTool,
  attachedFiles,
  onAttachToggle,
  conversationId,
  availableTools,
  setAvailableTools,
  searchQuery,
  setSearchQuery,
  onOpenFiles,
  activeBrowserSessionId,
  setActiveBrowserSessionId,
  browserState
}: ContextSidebarProps) {
  if (!isVisible) return null;

  return (
    <div className="w-1/2 border-l bg-background p-4 flex flex-col h-full absolute right-0 top-0 bottom-0 shadow-2xl z-20 md:relative md:shadow-none">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Manage Context</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 border rounded-md overflow-hidden bg-muted/50">
            <button
                onClick={() => setActiveTab('enabled')}
                className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'enabled' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
            >
                Tools ({enabledTools.length})
            </button>
            <button
                onClick={onOpenFiles}
                className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'files' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
            >
                Files ({attachedFiles.length})
            </button>
            <button
                onClick={() => setActiveTab('browser')}
                className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'browser' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
            >
                Browser
            </button>
            <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'marketplace' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
            >
                Market
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
            {activeTab === 'enabled' && (
                <div className="space-y-2">
                    {enabledTools.length === 0 ? (
                        <div className="text-center text-muted-foreground text-xs py-8">
                            No tools enabled yet.
                        </div>
                    ) : (
                        enabledTools.map((tool: any) => (
                            <div key={tool.id} className="p-3 rounded-lg border bg-card">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="font-medium text-sm">{tool.name}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleTool(tool.id)}
                                        className="text-xs px-2 py-1 rounded-md border shrink-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                    >
                                        Disable
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'files' && (
                <FileManager 
                  conversationId={conversationId}
                  attachedFileIds={attachedFiles.map((f: any) => f.id)}
                  onAttachToggle={onAttachToggle}
                />
            )}
            
            {activeTab === 'browser' && (
              <Browser 
                  onSessionChange={setActiveBrowserSessionId} 
                  externalSessionId={activeBrowserSessionId}
                  initialState={browserState}
              />
            )}

            {activeTab === 'marketplace' && (
                <ToolManager 
                    enabledTools={enabledTools}
                    onToggleTool={toggleTool}
                />
            )}

        </div>
    </div>
  );
}
