import React, { useEffect, useState } from 'react';
import { WordKernel, DocxParserPlugin, AgentCapabilityPlugin } from '@agentos/office';
import { WordEditor } from '../word/word-editor';
import { Button } from '../ui/button';
import { Save, Loader2 } from 'lucide-react';

interface DocxEditorProps {
    fileUrl?: string;
    fileContent?: ArrayBuffer; // Support direct content
    fileName: string;
    onSave?: (blob: Blob) => Promise<void>;
    readOnly?: boolean;
}

export const DocxEditor: React.FC<DocxEditorProps> = ({ fileUrl, fileContent, fileName, onSave, readOnly }) => {
    const [kernel, setKernel] = useState<WordKernel | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                let buffer: ArrayBuffer;
                if (fileContent) {
                    buffer = fileContent;
                } else if (fileUrl) {
                    const res = await fetch(fileUrl);
                    buffer = await res.arrayBuffer();
                } else {
                    // Empty doc logic - should not happen if fileUrl is provided but just in case
                    buffer = new ArrayBuffer(0);
                }

                // Initialize plugins
                const k = new WordKernel();
                const parser = new DocxParserPlugin();
                const agentPlugin = new AgentCapabilityPlugin();
                
                k.plugins.register(parser);
                k.plugins.register(agentPlugin);
                
                let state;
                if (buffer.byteLength > 0) {
                     // Use the parser registered on the temporary kernel
                     state = await (k as any).importDocx(buffer);
                } else {
                    // Default empty state
                    state = {
                        uid: 'doc-' + Date.now(),
                        content: [],
                        metadata: {}
                    };
                }
                
                // Re-initialize kernel with loaded state
                const finalKernel = new WordKernel({ initialState: state });
                finalKernel.plugins.register(parser);
                finalKernel.plugins.register(agentPlugin);
                
                setKernel(finalKernel);

            } catch (e) {
                console.error("Failed to load docx", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [fileUrl, fileContent]);

    const handleSave = async () => {
        if (!kernel || !onSave) return;
        setSaving(true);
        try {
            const blob = await (kernel as any).exportDocx(kernel.state);
            await onSave(blob as Blob);
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
    }

    if (!kernel) {
        return <div className="flex items-center justify-center h-full">Failed to load document</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-2 border-b bg-muted/20">
                <span className="font-medium text-sm">{fileName}</span>
                {!readOnly && onSave && (
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                )}
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
                <WordEditor kernel={kernel} readOnly={readOnly} />
            </div>
        </div>
    );
};
