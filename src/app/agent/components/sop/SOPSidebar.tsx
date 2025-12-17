import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SavedSop } from '@/lib/ai/sop-types';

interface SOPSidebarProps {
    isOpen: boolean;
    savedSops: SavedSop[];
    currentSopId: string | null;
    isLoading: boolean;
    onLoad: (sop: SavedSop) => void;
    onNew: () => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function SOPSidebar({
    isOpen,
    savedSops,
    currentSopId,
    isLoading,
    onLoad,
    onNew,
    onDelete
}: SOPSidebarProps) {
    return (
        <div className={`
            ${isOpen ? 'w-64' : 'w-0'} 
            transition-all duration-300 border-r bg-muted/10 flex flex-col overflow-hidden
        `}>
            <div className="p-4 border-b flex items-center justify-between">
                <span className="font-medium text-sm">Saved SOPs</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNew} title="New SOP">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {savedSops.map(sop => (
                    <div 
                        key={sop.id}
                        className={`
                            group flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-muted/50
                            ${currentSopId === sop.id ? 'bg-muted font-medium' : ''}
                        `}
                        onClick={() => onLoad(sop)}
                    >
                        <div className="truncate flex-1 pr-2">
                            <div className="truncate">{sop.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{new Date(sop.updatedAt).toLocaleDateString()}</div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => onDelete(sop.id, e)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
                {savedSops.length === 0 && !isLoading && (
                    <div className="text-center p-4 text-xs text-muted-foreground">
                        No saved SOPs
                    </div>
                )}
            </div>
        </div>
    );
}
