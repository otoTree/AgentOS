import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder, Mail, Globe, AppWindow } from 'lucide-react';

interface ChatHeaderProps {
  title: string;
  toolsCount: number;
  onOpenWindow: (type: 'file-browser' | 'email' | 'browser' | 'workbench' | 'editor', data?: any) => void;
  onLoadTools: () => void;
  onDelete: () => void;
  activeBrowserSessionId: string | null;
  browserState: any;
}

export function ChatHeader({
  title,
  toolsCount,
  onOpenWindow,
  onLoadTools,
  onDelete,
  activeBrowserSessionId,
  browserState
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <div>
            <h1 className="font-semibold">{title}</h1>
            <p className="text-xs text-muted-foreground">{toolsCount} tools enabled</p>
        </div>
        <div className="flex gap-2">
             <div className="w-px h-4 bg-border mx-1 self-center" />
             <button
                onClick={onLoadTools}
                className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
             >
                Manage Context
             </button>
             <button
                onClick={onDelete}
                className="text-xs px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
             >
                Delete
             </button>
        </div>
    </div>
  );
}
