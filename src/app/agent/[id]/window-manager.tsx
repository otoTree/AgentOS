
'use client';

import { useState, useEffect } from 'react';
import { WindowContainer, WindowMode } from '@/components/ui/window-container';
import { FileExplorer, WorkbenchPanel, FileEditor } from '../components';
import { getDownloadUrl } from '../actions';
import { updateFileContent } from '../actions';
import { Browser } from './browser';
import { EmailClient } from './email-client';
import { TableManager } from '@/components/konva-table';

export interface ActiveWindow {
    id: string;
    type: 'file-browser' | 'workbench' | 'editor' | 'browser' | 'email' | 'konva-table';
    title: string;
    mode: WindowMode;
    data?: any;
}

interface WindowManagerProps {
    windows: ActiveWindow[];
    onUpdateMode: (id: string, mode: WindowMode) => void;
    onClose: (id: string) => void;
    onOpenWindow: (type: ActiveWindow['type'], data?: any) => void;
}

function WindowedFileEditor({ file }: { file: any }) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!file) return;
        setLoading(true);
        getDownloadUrl(file.id).then(url => {
             fetch(url).then(res => res.text()).then(text => {
                 setContent(text);
                 setLoading(false);
             }).catch(err => {
                 console.error("Failed to fetch file content", err);
                 setLoading(false);
             });
        });
    }, [file?.id]);

    if (!file) return <div className="flex items-center justify-center h-full text-muted-foreground">No file selected</div>;
    if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading file content...</div>;
    
    return (
        <FileEditor 
            file={file} 
            initialContent={content || ''}
            onSave={async (newContent) => {
                 await updateFileContent(file.id, newContent);
            }} 
        />
    );
}

export function WindowManager({ windows, onUpdateMode, onClose, onOpenWindow }: WindowManagerProps) {
    // We separate embedded and floating/fullscreen windows
    // Embedded windows should be rendered in the layout flow (passed to parent? or rendered here?)
    // If rendered here, we need to know WHERE to render them.
    // The requirement says "Embedded (in chat interface)".
    // If this component is placed INSIDE the chat interface (e.g. above messages), then embedded windows will appear there.
    
    // However, floating windows should use Portal or fixed positioning (which WindowContainer does).

    return (
        <>
            {windows.map(win => (
                <WindowContainer
                    key={win.id}
                    title={win.title}
                    mode={win.mode}
                    onModeChange={(mode) => onUpdateMode(win.id, mode)}
                    onClose={() => onClose(win.id)}
                    className={win.mode === 'embedded' ? 'h-[500px] mb-4 shadow-sm border rounded-lg' : ''}
                >
                    {win.type === 'file-browser' && (
                        <div className="h-full overflow-hidden p-2">
                            <FileExplorer 
                                mode="embedded" 
                                onFileOpen={(file) => onOpenWindow('editor', file)} 
                            />
                        </div>
                    )}
                    {win.type === 'workbench' && (
                        <WorkbenchPanel />
                    )}
                    {win.type === 'editor' && (
                        <WindowedFileEditor file={win.data} />
                    )}
                    {win.type === 'browser' && (
                        <Browser 
                            initialState={win.data?.state} 
                            externalSessionId={win.data?.sessionId}
                            onSessionChange={(sid) => {
                                // optional: bubble up if needed
                            }}
                        />
                    )}
                    {win.type === 'email' && (
                        <EmailClient />
                    )}
                    {win.type === 'konva-table' && (
                        <div className="h-full w-full overflow-hidden bg-white">
                             <TableManager />
                        </div>
                    )}
                </WindowContainer>
            ))}
        </>
    );
}
