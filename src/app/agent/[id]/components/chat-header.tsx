import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder, Mail, Globe, AppWindow, Settings, Trash2, Box, Wrench } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
    <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-black/5 transition-all">
        <div className="flex flex-col">
            <h1 className="font-serif font-medium text-lg text-black tracking-tight">{title || "Untitled Conversation"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[10px] uppercase tracking-widest text-black/40 font-medium">{toolsCount} Active Tools</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
             <Button
                variant="ghost"
                size="sm"
                onClick={onLoadTools}
                className="h-8 gap-2 text-black/60 hover:text-black hover:bg-black/5 rounded-full text-xs font-medium px-3"
             >
                <Wrench className="w-3.5 h-3.5" />
                Context
             </Button>
             
             <div className="w-px h-4 bg-black/10 mx-1" />
             
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      className="h-8 w-8 text-black/40 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                   >
                      <Trash2 className="w-4 h-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Delete Conversation</TooltipContent>
               </Tooltip>
             </TooltipProvider>
        </div>
    </div>
  );
}
