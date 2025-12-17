import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Save, Play, Rocket, Sidebar as SidebarIcon } from 'lucide-react';
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
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <SidebarIcon className="w-4 h-4" />
                </Button>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 font-medium">
                        <Wand2 className="w-4 h-4 text-primary" />
                        SOP Agent
                    </div>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {sequence ? sequence.title : "Create or load a Standard Operating Procedure"}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 {sequence && (
                    <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                        Save
                    </Button>
                 )}
                 <Button variant="ghost" size="sm" onClick={onRunAll} disabled={isRunningAll} title="Run All Steps">
                    {isRunningAll ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
                    Run
                 </Button>
                 <Button variant="ghost" size="sm" onClick={onDeployOpen} title="Deploy">
                     <Rocket className={`w-3 h-3 mr-2 ${isDeployed ? 'text-green-500' : ''}`} />
                     Deploy
                 </Button>
            </div>
        </div>
    );
}
