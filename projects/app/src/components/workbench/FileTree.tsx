import React, { useState, useMemo } from 'react';
import { 
    ChevronRight, 
    ChevronDown, 
    File as FileIcon, 
    Folder as FolderIcon,
    MoreHorizontal,
    FilePlus,
    FolderPlus,
    Pencil,
    Trash2,
    Plus
} from 'lucide-react';
import { cn } from '@agentos/web/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@agentos/web/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@agentos/web/components/ui/dialog";
import { Input } from "@agentos/web/components/ui/input";
import { Button } from "@agentos/web/components/ui/button";

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children: TreeNode[];
}

interface FileTreeProps {
    files: string[];
    selectedFile: string;
    onSelect: (file: string) => void;
    onCreate?: (type: 'file' | 'folder', path: string) => void;
    onDelete?: (path: string) => void;
    onRename?: (path: string, newPath: string) => void;
    className?: string;
}

const buildFileTree = (paths: string[]): TreeNode[] => {
    const root: TreeNode[] = [];

    paths.forEach(path => {
        const parts = path.split('/');
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const existingNode = currentLevel.find(node => node.name === part);

            if (existingNode) {
                if (!isFile) {
                    currentLevel = existingNode.children;
                }
            } else {
                const newNode: TreeNode = {
                    name: part,
                    path: isFile ? path : parts.slice(0, index + 1).join('/'),
                    type: isFile ? 'file' : 'folder',
                    children: []
                };
                currentLevel.push(newNode);
                if (!isFile) {
                    currentLevel = newNode.children;
                }
            }
        });
    });

    // Sort: folders first, then files
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.children.length > 0) sortNodes(node.children);
        });
    };
    sortNodes(root);

    return root;
};

interface FileTreeNodeProps {
    node: TreeNode;
    level: number;
    onSelect: (file: string) => void;
    selectedFile: string;
    onAction: (action: string, node: TreeNode) => void;
}

const FileTreeNode = ({ node, level, onSelect, selectedFile, onAction }: FileTreeNodeProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === 'folder') {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.path);
        }
    };

    const isSelected = selectedFile === node.path;
    const paddingLeft = level * 12 + 12;

    return (
        <div className="select-none">
            <div
                className={cn(
                    "group flex items-center py-1 pr-2 hover:bg-muted/50 cursor-pointer text-sm rounded-sm transition-colors",
                    isSelected && "bg-primary/10 text-primary font-medium"
                )}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={handleClick}
            >
                <span className="mr-1 text-muted-foreground flex-shrink-0 w-4 flex justify-center">
                    {node.type === 'folder' && (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                </span>
                <span className="mr-2 text-muted-foreground flex-shrink-0">
                    {node.type === 'folder' ? <FolderIcon size={14} /> : <FileIcon size={14} />}
                </span>
                <span className="truncate flex-1">{node.name}</span>
                
                {/* Actions Menu */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal size={14} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            {node.type === 'folder' && (
                                <>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAction('new-file', node); }}>
                                        <FilePlus className="mr-2 h-4 w-4" /> New File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAction('new-folder', node); }}>
                                        <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAction('rename', node); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); onAction('delete', node); }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedFile={selectedFile}
                            onAction={onAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({ 
    files, 
    selectedFile, 
    onSelect, 
    onCreate, 
    onDelete, 
    onRename, 
    className 
}) => {
    const tree = useMemo(() => buildFileTree(files), [files]);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'new-file' | 'new-folder' | 'rename' | 'delete'>('new-file');
    const [targetNode, setTargetNode] = useState<TreeNode | null>(null);
    const [inputValue, setInputValue] = useState('');

    const handleAction = (action: string, node: TreeNode) => {
        setTargetNode(node);
        setDialogType(action as any);
        if (action === 'rename') {
            setInputValue(node.name);
        } else {
            setInputValue('');
        }
        setDialogOpen(true);
    };

    const handleRootAction = (action: 'new-file' | 'new-folder') => {
        setTargetNode(null); // Root
        setDialogType(action);
        setInputValue('');
        setDialogOpen(true);
    };

    const handleConfirm = () => {
        if (!inputValue && dialogType !== 'delete') return;

        const basePath = targetNode ? targetNode.path : '';
        // If target is file, use its parent dir? No, actions are on folders usually.
        // But context menu is on node.
        // If new file on a file node -> sibling? or error?
        // Let's assume new-file/folder only on Folder nodes (checked in UI).
        // Root action -> basePath = ''
        
        // For rename/delete, targetNode is the item itself.
        
        switch (dialogType) {
            case 'new-file':
                // targetNode is parent folder
                const newFilePath = basePath ? `${basePath}/${inputValue}` : inputValue;
                onCreate?.('file', newFilePath);
                break;
            case 'new-folder':
                 // targetNode is parent folder
                const newFolderPath = basePath ? `${basePath}/${inputValue}` : inputValue;
                onCreate?.('folder', newFolderPath);
                break;
            case 'rename':
                // targetNode is item
                const parentPath = targetNode?.path.split('/').slice(0, -1).join('/') || '';
                const renamedPath = parentPath ? `${parentPath}/${inputValue}` : inputValue;
                onRename?.(targetNode!.path, renamedPath);
                break;
            case 'delete':
                onDelete?.(targetNode!.path);
                break;
        }
        setDialogOpen(false);
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</span>
                <div className="flex gap-1">
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRootAction('new-file')} title="New File">
                        <FilePlus size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRootAction('new-folder')} title="New Folder">
                        <FolderPlus size={14} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                 <div className="flex flex-col gap-0.5">
                    {tree.map(node => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            level={0}
                            onSelect={onSelect}
                            selectedFile={selectedFile}
                            onAction={handleAction}
                        />
                    ))}
                    {tree.length === 0 && (
                        <div className="text-sm text-muted-foreground p-4 text-center italic">
                            No files
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'new-file' && 'Create New File'}
                            {dialogType === 'new-folder' && 'Create New Folder'}
                            {dialogType === 'rename' && 'Rename'}
                            {dialogType === 'delete' && 'Delete'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {dialogType === 'delete' ? (
                        <div className="py-4">
                            Are you sure you want to delete <span className="font-medium">{targetNode?.name}</span>?
                            {targetNode?.type === 'folder' && <div className="text-sm text-muted-foreground mt-2">This will delete all files inside the folder.</div>}
                        </div>
                    ) : (
                        <div className="py-4">
                            <Input 
                                value={inputValue} 
                                onChange={e => setInputValue(e.target.value)} 
                                placeholder="Enter name..."
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleConfirm();
                                }}
                                autoFocus
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button 
                            variant={dialogType === 'delete' ? 'destructive' : 'default'}
                            onClick={handleConfirm}
                        >
                            {dialogType === 'delete' ? 'Delete' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
