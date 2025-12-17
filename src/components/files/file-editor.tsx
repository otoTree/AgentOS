"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useState, useEffect } from "react";
import { FileWithShares } from "./types";
import { Loader2, Save } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { toast } from "@/components/ui/sonner";

interface FileEditorProps {
  file: FileWithShares;
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
    <div className="flex flex-col h-full w-full bg-white">
      <div className="flex justify-between items-center px-6 py-3 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 uppercase tracking-wider">
            {language}
          </span>
          {isDirty && <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
            {!readOnly && (
            <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
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
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={content}
          onChange={(value) => {
            setContent(value || "");
            setIsDirty(true);
          }}
          theme="light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 24,
            padding: { top: 24, bottom: 24 },
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            readOnly: readOnly,
            wordWrap: "on",
            scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                useShadows: false
            }
          }}
          loading={<div className="flex items-center justify-center h-full text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
        />
      </div>
    </div>
  );
}
