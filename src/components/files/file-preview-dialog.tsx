"use client";

import { FileWithShares } from "./types";
import { useEffect, useState } from "react";
import { getDownloadUrl, updateFileContent, getFileContent } from "@/app/file-actions";
import { FileEditor } from "./file-editor";
import MDEditor from "@uiw/react-md-editor";

export function FilePreviewDialog({
  file,
  open,
  onOpenChange
}: {
  file: FileWithShares;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<string | null>(null);

  const isEditable = file.mimeType.startsWith("text/") ||
                     file.mimeType === "application/json" ||
                     file.mimeType.includes("javascript") ||
                     file.mimeType.includes("typescript") ||
                     file.mimeType.includes("xml") ||
                     file.name.endsWith(".ts") ||
                     file.name.endsWith(".tsx") ||
                     file.name.endsWith(".js") ||
                     file.name.endsWith(".jsx") ||
                     file.name.endsWith(".md") ||
                     file.name.endsWith(".json") ||
                     file.name.endsWith(".css") ||
                     file.name.endsWith(".html") ||
                     file.name.endsWith(".py");

  useEffect(() => {
    if (open && file) {
      setLoading(true);
      setContent(null); // Reset content
      getDownloadUrl(file.id)
        .then(url => {
            setUrl(url);
          // If editable, pre-fetch text content
            if (isEditable) {
                return fetch(url).then(res => res.text()).then(text => setContent(text));
            }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setUrl(null);
      setIsEditing(false);
    }
  }, [open, file, isEditable]);

  const handleSave = async (newContent: string) => {
      await updateFileContent(file.id, newContent);
      setContent(newContent);
      setIsEditing(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden border border-zinc-200" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-6">
             <h2 className="text-lg font-medium text-zinc-900 truncate max-w-[400px]" title={file.name}>{file.name}</h2>
             {isEditable && !loading && content !== null && (
                 <div className="flex bg-zinc-100 rounded-lg p-1">
                     <button
                        onClick={() => setIsEditing(false)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${!isEditing ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
                     >
                         Preview
                     </button>
                     <button
                        onClick={() => setIsEditing(true)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${isEditing ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
                     >
                         Edit
                     </button>
                 </div>
             )}
          </div>
          <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors p-2 hover:bg-zinc-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="flex-1 bg-zinc-50 overflow-hidden flex flex-col relative">
          {loading ? (
             <div className="flex items-center justify-center h-full text-zinc-400">
                <div className="animate-pulse">Loading...</div>
             </div>
          ) : !url ? (
             <div className="flex items-center justify-center h-full text-zinc-400">
                <div className="text-destructive">Failed to load file</div>
             </div>
          ) : isEditing && content !== null ? (
             <FileEditor
                file={file}
                initialContent={content}
                onSave={handleSave}
             />
          ) : (
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                <PreviewContent file={file} url={url} content={content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextPreview({ content }: { content: string | null }) {
  if (content === null) return <div className="animate-pulse">Loading text...</div>;

  return (
    <div className="w-full h-full overflow-auto bg-white dark:bg-slate-950 p-4 rounded shadow-sm border">
      <pre className="text-sm font-mono whitespace-pre-wrap break-words text-foreground">
        {content}
      </pre>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string | null }) {
  if (content === null) return <div className="flex items-center justify-center h-full text-zinc-400"><div className="animate-pulse">Loading markdown...</div></div>;

  return (
    <div className="w-full h-full overflow-auto bg-white p-8 rounded-lg" data-color-mode="light">
      <div className="prose prose-zinc max-w-none">
        <MDEditor.Markdown source={content} style={{ whiteSpace: 'pre-wrap', backgroundColor: 'transparent', color: 'inherit' }} />
      </div>
    </div>
  );
}

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

function OfficePreview({ url, mimeType }: { url: string; mimeType: string }) {
    const docs = [{ uri: url, fileType: mimeType }];

    return (
        <div className="w-full h-full overflow-hidden bg-white">
            <DocViewer
                documents={docs}
                pluginRenderers={DocViewerRenderers}
                style={{ height: "100%", width: "100%" }}
                config={{
                    header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                    }
                }}
            />
        </div>
    );
}

function PreviewContent({ file, url, content }: { file: FileWithShares; url: string; content: string | null }) {
  if (file.mimeType.startsWith("image/")) {
    return <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />;
  }
  
  if (file.mimeType === "application/pdf") {
    return <iframe src={url} className="w-full h-full border-none" />;
  }

  // Check for office documents
  const isOffice = file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || // docx
                   file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // xlsx
                   file.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || // pptx
                   file.name.endsWith(".docx") ||
                   file.name.endsWith(".xlsx") ||
                   file.name.endsWith(".pptx");

  if (isOffice) {
      return <OfficePreview url={url} mimeType={file.mimeType} />;
  }

  // Check for markdown
  const isMarkdown = file.name.endsWith(".md") || file.mimeType.includes("markdown");
  if (isMarkdown) {
    return <MarkdownPreview content={content} />;
  }

  // Check for text/code types
  const isText = file.mimeType.startsWith("text/") ||
                 file.mimeType === "application/json" ||
                 file.mimeType.includes("javascript") ||
                 file.mimeType.includes("typescript") ||
                 file.mimeType.includes("xml") ||
                 file.name.endsWith(".ts") ||
                 file.name.endsWith(".tsx") ||
                 file.name.endsWith(".js") ||
                 file.name.endsWith(".jsx") ||
                 file.name.endsWith(".json") ||
                 file.name.endsWith(".css") ||
                 file.name.endsWith(".html") ||
                 file.name.endsWith(".py");
                 // Removed docx from isText because it is now handled by OfficePreview


  if (isText) {
    return <TextPreview content={content} />;
  }

  return (
    <div className="text-center">
      <p className="mb-4">Preview not available for this file type.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        Download to view
      </a>
    </div>
  );
}
