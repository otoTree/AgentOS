import React, { useEffect, useState } from 'react';
import { useSkillEditorStore } from '../../store/useSkillEditorStore';
import { Folder, FileCode, ChevronRight, ChevronDown, Plus, Trash2, Save, X, MessageSquare, FilePlus, FolderPlus, Edit2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { SkillFile } from '../../../types/rpc';
import SkillChat from './SkillChat';
import { CodeEditor as MonacoCodeEditor } from '../../../components/ui/code-editor';

type FileActionType = 'createFile' | 'createFolder' | 'rename' | 'delete';

interface FileAction {
    type: FileActionType;
    path: string;
    initialValue?: string;
}

const FileOperationModal = ({ action, onClose, onConfirm }: { action: FileAction, onClose: () => void, onConfirm: (value: string) => void }) => {
    const [value, setValue] = useState(action.initialValue || '');
    
    useEffect(() => {
        if (action.type !== 'delete') {
            setValue(action.initialValue || '');
        }
    }, [action]);

    const titleMap = {
        createFile: 'New File',
        createFolder: 'New Folder',
        rename: 'Rename',
        delete: 'Delete'
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-80 p-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-semibold mb-3">{titleMap[action.type]}</h3>
                
                {action.type === 'delete' ? (
                    <p className="text-sm text-black/70 mb-4">
                        Are you sure you want to delete <span className="font-medium text-black">{action.path.split('/').pop()}</span>?
                    </p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Input 
                            value={value} 
                            onChange={e => setValue(e.target.value)} 
                            className="h-8 text-sm mb-4" 
                            autoFocus 
                            placeholder={action.type === 'createFile' ? 'filename.ts' : 'foldername'}
                        />
                    </form>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
                    <Button 
                        size="sm" 
                        onClick={() => onConfirm(value)} 
                        className={cn("h-8 text-xs", action.type === 'delete' && "bg-red-600 hover:bg-red-700 text-white")}
                    >
                        {action.type === 'delete' ? 'Delete' : 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- File Tree Component ---
const FileTreeItem = ({ file, level = 0, onSelect, onAction }: { file: SkillFile, level?: number, onSelect: (path: string) => void, onAction: (action: FileAction) => void }) => {
    const { expandedFolders, toggleFolder, selectedFile } = useSkillEditorStore();
    const isExpanded = expandedFolders.has(file.path);
    const isSelected = selectedFile === file.path;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (file.type === 'directory') {
            toggleFolder(file.path);
        } else {
            onSelect(file.path);
        }
    };

    const handleCreateFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction({ type: 'createFile', path: file.path });
    };

    const handleCreateFolder = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction({ type: 'createFolder', path: file.path });
    };

    const handleRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction({ type: 'rename', path: file.path, initialValue: file.name });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction({ type: 'delete', path: file.path });
    };

    return (
        <div className="select-none">
            <div 
                className={cn(
                    "group flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors text-[13px] pr-2",
                    isSelected ? "bg-black/5 text-black font-medium" : "text-black/70 hover:bg-black/5 hover:text-black",
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                {file.type === 'directory' ? (
                    <>
                        {isExpanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                        <Folder size={14} className="text-blue-400 shrink-0" />
                    </>
                ) : (
                    <>
                        <span className="w-3.5 shrink-0" /> 
                        <FileCode size={14} className="text-gray-400 shrink-0" />
                    </>
                )}
                <span className="truncate flex-1">{file.name}</span>
                
                {/* Actions - Visible on Hover */}
                <div className="hidden group-hover:flex items-center gap-1 opacity-60">
                    {file.type === 'directory' && (
                        <>
                            <button onClick={handleCreateFile} className="hover:text-black hover:bg-black/10 p-0.5 rounded" title="New File">
                                <FilePlus size={12} />
                            </button>
                            <button onClick={handleCreateFolder} className="hover:text-black hover:bg-black/10 p-0.5 rounded" title="New Folder">
                                <FolderPlus size={12} />
                            </button>
                        </>
                    )}
                    <button onClick={handleRename} className="hover:text-black hover:bg-black/10 p-0.5 rounded" title="Rename">
                        <Edit2 size={12} />
                    </button>
                    <button onClick={handleDelete} className="hover:text-red-600 hover:bg-red-50 p-0.5 rounded" title="Delete">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            {file.type === 'directory' && isExpanded && file.children && (
                <div>
                    {file.children.map(child => (
                        <FileTreeItem key={child.path} file={child} level={level + 1} onSelect={onSelect} onAction={onAction} />
                    ))}
                </div>
            )}
        </div>
    );
};

const getLanguageFromPath = (path: string) => {
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'py':
            return 'python';
        case 'css':
            return 'css';
        case 'html':
            return 'html';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        default:
            return 'plaintext';
    }
};

// --- Editor Component ---
const CodeEditor = () => {
    const { fileContent, updateFileContent, saveFile, isSaving, selectedFile } = useSkillEditorStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveFile();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveFile]);

    if (!selectedFile) {
        return (
            <div className="flex-1 flex items-center justify-center text-black/20 text-sm">
                Select a file to edit
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
             <div className="h-9 border-b border-border flex items-center justify-between px-4 bg-gray-50/50">
                <span className="text-xs text-black/50 font-mono">{selectedFile}</span>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs gap-1 hover:bg-black/5"
                    onClick={() => saveFile()}
                    disabled={isSaving}
                >
                    <Save size={12} />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">
                <MonacoCodeEditor
                    language={getLanguageFromPath(selectedFile)}
                    value={fileContent}
                    onChange={(value) => updateFileContent(value || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 }
                    }}
                    theme="light"
                />
            </div>
        </div>
    );
};

// --- Main Page Component ---
export default function SkillEditor() {
    const { currentSkillName, closeSkill, files, loadFiles, selectFile, createFile, createDirectory, renameNode, deleteNode, expandedFolders, toggleFolder } = useSkillEditorStore();
    const [action, setAction] = useState<FileAction | null>(null);
    const [activeTab, setActiveTab] = useState<'code' | 'chat'>('chat');

    // Initial load
    useEffect(() => {
        loadFiles();
    }, [currentSkillName]);

    const handleCreateFileRoot = () => {
        setAction({ type: 'createFile', path: '' });
    };

    const handleCreateFolderRoot = () => {
        setAction({ type: 'createFolder', path: '' });
    };

    const handleConfirm = async (value: string) => {
        if (!action) return;
        
        try {
            if (action.type === 'createFile') {
                const newPath = action.path ? `${action.path}/${value}` : value;
                await createFile(newPath);
                if (action.path && !expandedFolders.has(action.path)) {
                   await toggleFolder(action.path);
                }
            } else if (action.type === 'createFolder') {
                const newPath = action.path ? `${action.path}/${value}` : value;
                await createDirectory(newPath);
                if (action.path && !expandedFolders.has(action.path)) {
                   await toggleFolder(action.path);
                }
            } else if (action.type === 'rename') {
                const parentPath = action.path.includes('/') ? action.path.substring(0, action.path.lastIndexOf('/')) : '';
                const newPath = parentPath ? `${parentPath}/${value}` : value;
                await renameNode(action.path, newPath);
            } else if (action.type === 'delete') {
                await deleteNode(action.path);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAction(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-in">
            {action && (
                <FileOperationModal 
                    action={action} 
                    onClose={() => setAction(null)} 
                    onConfirm={handleConfirm} 
                />
            )}
            {/* Header */}
            <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={closeSkill} className="h-8 w-8">
                        <X size={16} />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-semibold">{currentSkillName}</h1>
                        <span className="text-[10px] text-black/40">Skill Workspace</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toolbar actions could go here */}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: File Tree */}
                <aside className="w-64 border-r border-border bg-gray-50/30 flex flex-col">
                    <div className="p-2 border-b border-border/50 flex items-center justify-between">
                        <span className="text-xs font-medium text-black/50 px-2">EXPLORER</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateFileRoot} title="New File">
                                <FilePlus size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateFolderRoot} title="New Folder">
                                <FolderPlus size={12} />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {files.map(file => (
                            <FileTreeItem 
                                key={file.path} 
                                file={file} 
                                onSelect={(path) => {
                                    selectFile(path);
                                    setActiveTab('code');
                                }} 
                                onAction={setAction} 
                            />
                        ))}
                    </div>
                </aside>

                {/* Right: Tabs (Code / Chat) */}
                <main className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Tab Header */}
                    <div className="h-10 border-b border-border flex items-center px-4 gap-4 bg-gray-50/30 justify-between">
                         <div className="flex p-1 bg-gray-200/50 rounded-lg gap-1">
                             <button 
                                 onClick={() => setActiveTab('code')}
                                 className={cn(
                                     "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2", 
                                     activeTab === 'code' ? "bg-white shadow-sm text-black" : "text-black/50 hover:text-black/80"
                                 )}
                             >
                                 <FileCode size={12} />
                                 Code
                             </button>
                             <button 
                                 onClick={() => setActiveTab('chat')}
                                 className={cn(
                                     "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2", 
                                     activeTab === 'chat' ? "bg-white shadow-sm text-black" : "text-black/50 hover:text-black/80"
                                 )}
                             >
                                 <MessageSquare size={12} />
                                 Chat
                             </button>
                         </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                         <div className={cn("absolute inset-0 flex flex-col bg-white", activeTab === 'code' ? "z-10" : "z-0 invisible")}>
                              <CodeEditor />
                         </div>
                         <div className={cn("absolute inset-0 flex flex-col bg-white", activeTab === 'chat' ? "z-10" : "z-0 invisible")}>
                              <SkillChat />
                         </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
