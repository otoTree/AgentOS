import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Save, Play, Rocket, Sidebar as SidebarIcon, ChevronRight } from 'lucide-react';
import { SOPSequence } from '@/lib/ai/sop-types';

interface SOPHeaderProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (v: boolean) => void;
    sequence: SOPSequence | null;
    isSaving: boolean;
    onSave: () => void;
    isRunningAll: boolean;
    onRunAll: () => void;
    isDeployed: boolean;
    onDeployOpen: () => void;
}

export function SOPHeader({
    isSidebarOpen,
    setIsSidebarOpen,
    sequence,
    isSaving,
    onSave,
    isRunningAll,
    onRunAll,
    isDeployed,
    onDeployOpen
}: SOPHeaderProps) {
    return (
        <div className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-3 overflow-hidden">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <SidebarIcon className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm overflow-hidden">
                    <div className="flex items-center gap-2 font-semibold text-foreground shrink-0">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                            <Wand2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="hidden sm:inline">SOP Agent</span>
                    </div>
                    
                    {sequence && (
                        <>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate font-medium text-muted-foreground">{sequence.title}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                 {sequence && (
                    <>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onSave} 
                            disabled={isSaving}
                            className="h-8 text-xs"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
                            Save
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={onRunAll} 
                            disabled={isRunningAll} 
                            className="h-8 text-xs shadow-sm"
                        >
                            {isRunningAll ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
                            Run All
                        </Button>
                        <Button 
                            variant={isDeployed ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={onDeployOpen} 
                            className={`h-8 text-xs ${isDeployed ? 'text-green-600 bg-green-500/10 hover:bg-green-500/20' : ''}`}
                        >
                            <Rocket className={`w-3 h-3 mr-1.5 ${isDeployed ? 'text-green-600' : ''}`} />
                            {isDeployed ? 'Deployed' : 'Deploy'}
                        </Button>
                    </>
                 )}
            </div>
        </div>
    );
}
