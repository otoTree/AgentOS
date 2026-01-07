import React, { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { 
    Trash2, 
    ArrowUpFromLine, 
    ArrowDownFromLine, 
    ArrowLeftFromLine, 
    ArrowRightFromLine,
    Eraser,
    Merge,
    Split
} from 'lucide-react';

export type ContextMenuAction = 
    | 'insert-row-above' 
    | 'insert-row-below' 
    | 'delete-row' 
    | 'insert-col-left' 
    | 'insert-col-right' 
    | 'delete-col' 
    | 'clear-content'
    | 'merge-cells'
    | 'unmerge-cells';

type ContextMenuProps = {
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    onAction: (action: ContextMenuAction) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, onClose, onAction }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    const handleAction = (action: ContextMenuAction) => {
        onAction(action);
        onClose();
    };

    return (
        <div 
            ref={menuRef}
            className="absolute z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-top-2"
            style={{ top: y, left: x }}
        >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Rows</div>
            <ContextMenuItem onClick={() => handleAction('insert-row-above')} icon={<ArrowUpFromLine className="h-4 w-4 mr-2" />}>
                Insert Row Above
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('insert-row-below')} icon={<ArrowDownFromLine className="h-4 w-4 mr-2" />}>
                Insert Row Below
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('delete-row')} icon={<Trash2 className="h-4 w-4 mr-2" />} danger>
                Delete Row
            </ContextMenuItem>

            <div className="h-px bg-muted my-1" />
            
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Columns</div>
            <ContextMenuItem onClick={() => handleAction('insert-col-left')} icon={<ArrowLeftFromLine className="h-4 w-4 mr-2" />}>
                Insert Column Left
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('insert-col-right')} icon={<ArrowRightFromLine className="h-4 w-4 mr-2" />}>
                Insert Column Right
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('delete-col')} icon={<Trash2 className="h-4 w-4 mr-2" />} danger>
                Delete Column
            </ContextMenuItem>

            <div className="h-px bg-muted my-1" />

            <ContextMenuItem onClick={() => handleAction('merge-cells')} icon={<Merge className="h-4 w-4 mr-2" />}>
                Merge Cells
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('unmerge-cells')} icon={<Split className="h-4 w-4 mr-2" />}>
                Unmerge Cells
            </ContextMenuItem>

            <div className="h-px bg-muted my-1" />

            <ContextMenuItem onClick={() => handleAction('clear-content')} icon={<Eraser className="h-4 w-4 mr-2" />}>
                Clear Content
            </ContextMenuItem>
        </div>
    );
};

const ContextMenuItem: React.FC<{ 
    onClick: () => void; 
    children: React.ReactNode; 
    icon?: React.ReactNode;
    danger?: boolean;
}> = ({ onClick, children, icon, danger }) => (
    <div 
        onClick={onClick}
        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${danger ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : ''}`}
    >
        {icon}
        {children}
    </div>
);
