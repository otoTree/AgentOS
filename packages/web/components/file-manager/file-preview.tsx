import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeEditor } from '../ui/code-editor';
import { cn } from '../../lib/utils';

export type FilePreviewProps = {
  name: string;
  content?: string;
  url?: string;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ name, content, url, className }) => {
  const extension = name.split('.').pop()?.toLowerCase();

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension || '');
  const isVideo = ['mp4', 'webm'].includes(extension || '');
  const isMarkdown = ['md'].includes(extension || '');
  const isText = ['txt', 'json', 'ts', 'tsx', 'js', 'css', 'html', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'go', 'rs'].includes(extension || '');

  if (isImage && url) {
    return (
      <div className={cn("flex items-center justify-center h-full w-full bg-black/5 p-4", className)}>
        <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  if (isVideo && url) {
    return (
      <div className={cn("flex items-center justify-center h-full w-full bg-black/5 p-4", className)}>
        <video src={url} controls className="max-w-full max-h-full" />
      </div>
    );
  }

  if (isMarkdown && content) {
    return (
      <div className={cn("prose prose-sm max-w-none p-4 dark:prose-invert overflow-auto h-full", className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  if (extension === 'pdf' && url) {
    return (
      <div className={cn("h-full w-full", className)}>
        <iframe src={url} className="w-full h-full border-none" />
      </div>
    );
  }

  // Treat as text if content is provided and not one of the above, or explicitly text
  if (content !== undefined) {
     // Map extension to monaco language
     const languageMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'json': 'json',
        'css': 'css',
        'html': 'html',
        'yaml': 'yaml',
        'yml': 'yaml',
        'txt': 'plaintext',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'go': 'go',
        'rs': 'rust',
        'md': 'markdown'
     };
     const language = languageMap[extension || ''] || 'plaintext';

    return (
      <div className={cn("h-full w-full", className)}>
        <CodeEditor
          value={content}
          language={language}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            automaticLayout: true
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Preview not available
    </div>
  );
};
