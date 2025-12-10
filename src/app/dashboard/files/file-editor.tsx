"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useState, useEffect } from "react";
import { File } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { toast } from "@/components/ui/sonner";

interface FileEditorProps {
  file: File;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export function FileEditor({ file, initialContent, onSave, readOnly = false }: FileEditorProps) {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Detect language based on mimetype or extension
  const getLanguage = (mimeType: string, name: string) => {
    if (mimeType.includes("javascript")) return "javascript";
    if (mimeType.includes("typescript")) return "typescript";
    if (mimeType.includes("json")) return "json";
    if (mimeType.includes("html")) return "html";
    if (mimeType.includes("css")) return "css";
    if (mimeType.includes("markdown")) return "markdown";
    if (mimeType.includes("python")) return "python";
    
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'js') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'py') return 'python';
    if (ext === 'md') return 'markdown';
    if (ext === 'json') return 'json';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'sql') return 'sql';
    if (ext === 'yaml' || ext === 'yml') return 'yaml';
    
    return "plaintext";
  };

  const language = getLanguage(file.mimeType, file.name);
  const isMarkdown = language === "markdown";

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  // Listen for Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving && !readOnly) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, isDirty, isSaving, readOnly]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center px-4 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-background px-2 py-1 rounded border">
            {language}
          </span>
          {isDirty && <span className="text-xs text-amber-500 font-medium">● Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
            {!readOnly && (
            <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                {isSaving ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </>
                ) : (
                <>
                    <Save className="w-3 h-3" /> Save
                </>
                )}
            </button>
            )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {isMarkdown ? (
            <div className="h-full flex flex-col" data-color-mode="auto">
                 <MDEditor
                    value={content}
                    onChange={(val) => {
                        setContent(val || "");
                        setIsDirty(val !== initialContent);
                    }}
                    height="100%"
                    preview="live"
                    hideToolbar={false}
                    visibleDragbar={false}
                    className="!border-none"
                    style={{ height: '100%' }}
                 />
            </div>
        ) : (
            <Editor
            height="100%"
            defaultLanguage={language}
            value={content}
            onChange={(value) => {
                setContent(value || "");
                setIsDirty(value !== initialContent);
            }}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                wordWrap: "on",
                readOnly: readOnly,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
            }}
            />
        )}
      </div>
    </div>
  );
}
