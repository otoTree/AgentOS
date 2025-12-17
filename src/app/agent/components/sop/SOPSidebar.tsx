import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileText, Search } from 'lucide-react';
import { SavedSop } from '@/lib/ai/sop-types';
import { Input } from '@/components/ui/input';

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
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredSops = savedSops.filter(sop => 
        sop.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`
            ${isOpen ? 'w-72' : 'w-0'} 
            transition-all duration-300 border-r bg-muted/5 flex flex-col overflow-hidden shrink-0
        `}>
            {/* Header */}
            <div className="p-4 border-b space-y-4 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Library</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={onNew} title="Create New SOP">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Search SOPs..." 
                        className="h-8 pl-8 text-xs bg-muted/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredSops.map(sop => (
                    <div 
                        key={sop.id}
                        className={`
                            group flex items-start gap-3 p-3 rounded-lg text-sm cursor-pointer transition-all duration-200
                            ${currentSopId === sop.id 
                                ? 'bg-primary/10 text-primary font-medium' 
                                : 'hover:bg-muted/50 text-foreground/80 hover:text-foreground'}
                        `}
                        onClick={() => onLoad(sop)}
                    >
                        <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${currentSopId === sop.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                            <div className="truncate leading-tight">{sop.name}</div>
                            <div className={`text-[10px] truncate mt-1 ${currentSopId === sop.id ? 'text-primary/70' : 'text-muted-foreground'}`}>
                                {new Date(sop.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 -mr-1"
                            onClick={(e) => onDelete(sop.id, e)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ))}
                
                {filteredSops.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <FileText className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">No SOPs found</p>
                        {searchTerm && <p className="text-[10px] text-muted-foreground mt-1">Try a different search term</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
